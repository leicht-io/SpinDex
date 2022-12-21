import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'profiles', freezeTableName: true, timestamps: false })
export class Profile extends Model<Profile> {
  @Column({
    type: DataType.TEXT
  })
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  public name: string;

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
  public start: number;

  @Column({
    type: DataType.INTEGER
  })
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  public finish: number;

  @Column({
    type: DataType.BOOLEAN
  })
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  public active: boolean;
}
