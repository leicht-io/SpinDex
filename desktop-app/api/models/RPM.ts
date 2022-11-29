import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({tableName: 'rpms', freezeTableName: true, timestamps: false})
export class RPM extends Model<RPM> {

    @Column({
        type: DataType.FLOAT
    })
    public value: number;

    @Column({
        type: DataType.TEXT
    })
    public profileId: string;

    @Column({
        type: DataType.INTEGER
    })
    public timestamp: number;
}
