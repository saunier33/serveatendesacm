import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  HasMany,
  BelongsTo,
  ForeignKey,
  BeforeCreate,
  Default
} from "sequelize-typescript";

import { v4 as uuidv4 } from "uuid";

import ChatMessage from "./ChatMessage";
import ChatUser from "./ChatUser";
import User from "./User";

@Table({ tableName: "Chats" })
class Chat extends Model<Chat> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Default(uuidv4())
  @Column
  uuid: string;

  @Column({ defaultValue: "" })
  title: string;

  @ForeignKey(() => User)
  @Column
  ownerId: number;

  @Column({ defaultValue: "" })
  lastMessage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => User)
  owner: User;

  @HasMany(() => ChatUser)
  users: ChatUser[];

  @HasMany(() => ChatMessage)
  messages: ChatMessage[];

  @BeforeCreate
  static setUUID(chat: Chat) {
    chat.uuid = uuidv4();
  }
}

export default Chat;
