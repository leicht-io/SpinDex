import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'rpms', freezeTableName: true, timestamps: false })
export class RPM extends Model<RPM> {

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
