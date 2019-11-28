import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({tableName: 'profiles', freezeTableName: true, timestamps: false})
export class Profile extends Model<Profile> {
    @Column
    public name: string;

    @Column
    public profileId: string;

    @Column({
        type: DataType.INTEGER
    })
    public start: number;

    @Column({
        type: DataType.INTEGER
    })
    public finish: number;

    @Column({
        type: DataType.BOOLEAN
    })
    public active: boolean;
}
