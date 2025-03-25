import { instanceToPlain } from "class-transformer";
import { BaseEntity, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export default abstract class Entity extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn()
    createAt: Date;

    @UpdateDateColumn()
    UpdatedAt: Date;

    // toJSON() {
    //     // instanceToPlain(this);
    // }
}