import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'temperatures', freezeTableName: true, timestamps: false })
export class Temperature extends Model<Temperature> {

  @Column({
    type: DataType.FLOAT
  })
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  public value: number;

  @Column({
    type: DataType.TEXT
  })
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  public profileId: string;

  @Column({
    type: DataType.INTEGER
  })
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  public timestamp: number;
}
