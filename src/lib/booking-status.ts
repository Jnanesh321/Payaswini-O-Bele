export const BOOKING_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Requested",
  OWNER_PENDING: "Awaiting owner",
  OWNER_ACCEPTED: "Owner accepted",
  OPERATOR_PENDING: "Finding an operator",
  OPERATOR_ASSIGNED: "Operator assigned",
  OPERATOR_ACCEPTED: "Operator accepted",
  FETCHING_TOOL: "Picking up the tool",
  TOOL_COLLECTED: "Tool collected",
  TRAVELLING_TO_FARM: "On the way to the farm",
  ARRIVED: "Arrived at farm",
  WORK_STARTED: "Work in progress",
  WORK_PAUSED: "Work paused",
  WORK_RESUMED: "Work in progress",
  WORK_COMPLETED: "Work completed",
  RETURNING_TOOL: "Returning the tool",
  TOOL_RETURNED: "Tool returned",
  INSPECTION: "Under inspection",
  COMPLETED: "Completed",
  CANCELLED_BY_FARMER: "Cancelled by you",
  CANCELLED_BY_OWNER: "Declined by owner",
  CANCELLED_BY_OPERATOR: "Cancelled by operator",
  CANCELLED_BY_PLATFORM: "Cancelled by platform",
  FAILED_NO_OPERATOR: "No operator available",
  DISPUTED: "Disputed",
}

/** Badge variant keyed by how "finished" a state feels. */
export type BookingStatusBadgeVariant = "default" | "success" | "warning" | "destructive"

export function bookingStatusTone(status: string): BookingStatusBadgeVariant {
  switch (status) {
    case "COMPLETED":
    case "TOOL_RETURNED":
      return "success"
    case "INSPECTION":
    case "WORK_COMPLETED":
      return "warning"
    case "DISPUTED":
    case "FAILED_NO_OPERATOR":
      return "destructive"
    case "CANCELLED_BY_FARMER":
    case "CANCELLED_BY_OWNER":
    case "CANCELLED_BY_OPERATOR":
    case "CANCELLED_BY_PLATFORM":
      return "destructive"
    default:
      return "default"
  }
}

export function bookingStatusLabel(status: string): string {
  return BOOKING_STATUS_LABEL[status] ?? status
}