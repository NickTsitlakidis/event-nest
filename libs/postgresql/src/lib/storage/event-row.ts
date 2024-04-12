export interface EventRow {
    id: string;
    aggregate_root_name: string;
    aggregate_root_version: number;
    aggregate_root_id: string;
    event_name: string;
    payload: string;
    created_at: Date;
}
