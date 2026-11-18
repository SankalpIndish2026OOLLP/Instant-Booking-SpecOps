/** The only process-level state the server keeps: whether it is draining (RQ-OPS-008). */
export interface LifecycleState {
  shuttingDown: boolean;
}
