import { Check, Entity } from 'typeorm';
import {
  CreatedAtColumn,
  KeyColumn,
  LEGACY_CRM_SCHEMA,
  TextColumn,
  UpdatedAtColumn,
} from '../common/columns';

/** 郵遞區號建檔；舊 MDB 沒有可移轉的資料，表保留給建檔畫面。 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'postal_codes' })
@Check(`"postal_code" <> ''`)
export class LegacyPostalCode {
  @KeyColumn(10)
  postal_code: string;

  @TextColumn(100) region_name: string;
  @CreatedAtColumn() created_at: Date;
  @UpdatedAtColumn() updated_at: Date;
}
