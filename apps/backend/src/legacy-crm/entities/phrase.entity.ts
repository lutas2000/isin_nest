import { Check, Entity } from 'typeorm';
import {
  CreatedAtColumn,
  KeyColumn,
  LEGACY_CRM_SCHEMA,
  TextColumn,
  UpdatedAtColumn,
} from '../common/columns';

/** 詞彙建檔（phrase.mdb）。 */
@Entity({ schema: LEGACY_CRM_SCHEMA, name: 'phrases' })
@Check(`"phrase_no" <> ''`)
export class LegacyPhrase {
  @KeyColumn(10)
  phrase_no: string;

  @TextColumn(250) content: string;
  @CreatedAtColumn() created_at: Date;
  @UpdatedAtColumn() updated_at: Date;
}
