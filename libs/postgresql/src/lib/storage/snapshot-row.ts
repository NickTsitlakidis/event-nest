export interface SnapshotRow {
    aggregate_root_id: string;
    aggregate_root_version: number;
    id: string;
    payload: string;
    revision: number;
}
