import {
  Check,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import {
  CreatedAtColumn,
  KeyColumn,
  LEGACY_CRM_SCHEMA,
  RocDateColumn,
  RocDateRawColumn,
  TextColumn,
  UnitsColumn,
  UpdatedAtColumn,
} from '../common/columns';

/** 圖組建檔（dwgroup.mdb 的 gtable／itable）。 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'drawing_groups' })
@Check(`"group_no" <> ''`)
export class LegacyDrawingGroup {
  @KeyColumn(10)
  group_no: string;

  @RocDateColumn() created_date: string | null;
  @RocDateRawColumn() created_date_raw: string | null;
  @TextColumn(10) customer_code: string;
  @TextColumn(10) customer_name: string;
  @TextColumn(40) customer_drawing_no: string;
  @TextColumn(20) notes: string;
  @TextColumn(1) legacy_xx: string;
  @CreatedAtColumn() created_at: Date;
  @UpdatedAtColumn() updated_at: Date;

  @OneToMany(() => LegacyDrawingGroupItem, (item) => item.group)
  items: LegacyDrawingGroupItem[];
}

/**
 * 圖組明細。isin_vb6 的主鍵是 (group_no, customer_code, line_no)，但 customer_code
 * 一律取自表頭、項次在同一圖組內不重複，這裡主鍵簡化為 (group_no, line_no)，項次改存整數。
 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'drawing_group_items' })
@Check(`"line_no" BETWEEN 1 AND 99`)
@Index(['drawing_no', 'customer_drawing_no'])
export class LegacyDrawingGroupItem {
  @KeyColumn(10)
  group_no: string;

  @PrimaryColumn({ type: 'smallint' })
  line_no: number;

  @TextColumn(10) customer_code: string;
  @TextColumn(10) drawing_no: string;
  @TextColumn(40) customer_drawing_no: string;
  @TextColumn(10) material: string;
  @TextColumn(6) thickness: string;
  @UnitsColumn() quantity_units: number;
  /** 雷射工件；同舊版 dwgroup.FLAG，任意兩字照原樣保存（舊資料有 1、U、漆 等值）。 */
  @TextColumn(2) is_laser: string;

  @ManyToOne(() => LegacyDrawingGroup, (group) => group.items, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'group_no' })
  group: LegacyDrawingGroup;
}
