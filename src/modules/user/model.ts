import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm'

import { Task } from '../task/model'
import { TaskComment } from '../task/subs/comment/model'
import { UserRole } from './userRole/model'

@Entity()
export class User {
  /***** columns *****/
  @PrimaryGeneratedColumn()
  public id: number

  @Column({
    nullable: false,
    unique: true
  })
  public email: string

  @Column()
  public firstname: string

  @Column()
  public lastname: string

  @Column({
    select: false
  })
  public password: string

  @Column({
    default: true
  })
  public active: boolean

  /***** relations *****/
  @OneToMany(type => Task, task => task.author)
  public author: Task[]

  @OneToMany(type => Task, task => task.author)
  public assignee: Task[]

  @OneToMany(type => TaskComment, taskComment => taskComment.author)
  public comments: TaskComment[]

  @ManyToOne(type => UserRole, userRole => userRole.users)
  public userRole: UserRole
}