import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'adb-typeorm';

@Entity('resources')
export class Resource {
  @PrimaryColumn('varchar', { length: 100 })
  id!: string;

  @Column('varchar', { length: 500 })
  fileName!: string; // 原始文件名

  @Column('varchar', { length: 500 })
  filePath!: string; // 服务器存储路径

  @Column('varchar', { length: 100 })
  mimeType!: string; // MIME 类型

  @Column('bigint')
  fileSize!: number; // 文件大小（字节）

  @Column('varchar', { length: 100, nullable: true })
  uploader?: string; // 上传者（可选）

  @Column('text', { nullable: true })
  metadata?: string; // JSON object string，存储额外元数据

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

