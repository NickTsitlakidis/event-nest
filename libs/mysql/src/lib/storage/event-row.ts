export interface EventRow {
    aggregate_root_id: string;
    aggregate_root_name: string;
    aggregate_root_version: number;
    created_at: Date;
    event_name: string;
    id: string;
    payload: string;
}
