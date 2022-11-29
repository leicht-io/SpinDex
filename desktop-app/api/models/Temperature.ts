import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({tableName: 'temperatures', freezeTableName: true, timestamps: false})
export class Temperature extends Model<Temperature> {

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
