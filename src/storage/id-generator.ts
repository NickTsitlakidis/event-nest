export interface IdGenerator {
    generateEntityId(): Promise<string>;
}
