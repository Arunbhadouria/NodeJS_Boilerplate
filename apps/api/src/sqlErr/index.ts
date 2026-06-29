import { PostgresError } from "postgres";
import {
  newBadRequestError,
  newNotFoundError,
  newInternalServerError,
  isHttpError,
  type FieldError,
} from "../errors";

// --- Error codes ---
export type SqlErrCode =
  | "other"
  | "not_null_violation"
  | "foreign_key_violation"  
  | "unique_violation"
  | "check_violation"
  | "exclude_violation"
  | "transaction_failed"
  | "deadlock_detected"
  | "too_many_connections";

// SQLSTATE → readable code
export function mapCode(code: string): SqlErrCode {
  switch (code) {
    case "23502": return "not_null_violation";
    case "23503": return "foreign_key_violation";
    case "23505": return "unique_violation";
    case "23514": return "check_violation";
    case "23P01": return "exclude_violation";
    case "25P02": return "transaction_failed";
    case "40P01": return "deadlock_detected";
    case "53300": return "too_many_connections";
    default:      return "other";
  }
}

// --- Helper functions ---

function humanizeText(text: string): string {
  if (!text) return "";
  return text
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getEntityName(tableName?: string, columnName?: string): string {
  // column ending in _id = FK relationship entity
  if (columnName?.toLowerCase().endsWith("_id")) {
    return humanizeText(columnName.slice(0, -3));
  }

  if (tableName) {
    // singularize
    const singular = tableName.endsWith("s")
      ? tableName.slice(0, -1)
      : tableName;
    return humanizeText(singular);
  }

  return "record";
}

function generateErrorCode(errType: SqlErrCode, tableName?: string): string {
  let domain = (tableName ?? "RECORD").toUpperCase();
  if (domain.endsWith("S")) domain = domain.slice(0, -1);

  const actionMap: Partial<Record<SqlErrCode, string>> = {
    foreign_key_violation: "NOT_FOUND",
    unique_violation:      "ALREADY_EXISTS",
    not_null_violation:    "REQUIRED",
    check_violation:       "INVALID",
  };

  return `${domain}_${actionMap[errType] ?? "ERROR"}`;
}

function extractColumnForUniqueViolation(constraintName?: string): string {
  if (!constraintName) return "";

  // convention: unique_table_column
  if (constraintName.startsWith("unique_")) {
    const parts = constraintName.split("_");
    if (parts.length >= 3) return parts[parts.length - 1] ?? "";
  }

  // convention: table_column_key
  const match = constraintName.match(/_([^_]+)_(?:key|ukey)$/);
  return match?.[1] ?? "";
}

function formatUserFriendlyMessage(
  code: SqlErrCode,
  tableName?: string,
  columnName?: string
): string {
  const entityName = getEntityName(tableName, columnName);

  switch (code) {
    case "foreign_key_violation":
      return `The referenced ${entityName} does not exist`;
    case "unique_violation":
      return `A ${entityName} with this identifier already exists`;
    case "not_null_violation":
      return `The ${humanizeText(columnName ?? "field")} is required`;
    case "check_violation":
      return columnName
        ? `The ${humanizeText(columnName)} value does not meet required conditions`
        : "One or more values do not meet required conditions";
    default:
      return "An error occurred while processing your request";
  }
}

// --- Main function called in repositories ---

export function handleDbError(err: unknown): never {
  // already an HttpError — pass through
  if (isHttpError(err)) throw err;

  // postgres.js error
  if (err instanceof PostgresError) {
    const code = mapCode(err.code ?? "");
    const errorCode = generateErrorCode(code, err.table_name);
    const userMessage = formatUserFriendlyMessage(code, err.table_name, err.column_name);

    switch (code) {
      case "foreign_key_violation":
        throw newBadRequestError({ message: userMessage, code: errorCode });

      case "unique_violation": {
        const column = extractColumnForUniqueViolation(err.constraint_name);
        const message = column
          ? userMessage.replace("identifier", humanizeText(column))
          : userMessage;
        throw newBadRequestError({ message, override: true, code: errorCode });
      }

      case "not_null_violation": {
        const fieldErrors: FieldError[] = [{
          field: (err.column_name ?? "").toLowerCase(),
          error: "is required",
        }];
        throw newBadRequestError({
          message: userMessage,
          override: true,
          code: errorCode,
          errors: fieldErrors,
        });
      }

      case "check_violation":
        throw newBadRequestError({ message: userMessage, override: true, code: errorCode });

      default:
        throw newInternalServerError();
    }
  }

  // no rows found
  if (err instanceof Error && err.message === "No results") {
    throw newNotFoundError("Resource not found", false);
  }

  throw newInternalServerError();
}