/**
 * X3-05 (Round 14 A6): the screener query ENGINE.
 *
 * Evaluates a parsed QueryNode (see parser.ts) against a SlimStockRow.
 * Pure, total, deterministic — no Date.now, no Math.random, no dynamic
 * code (Constitution 18 + the X3-05 "no eval, no Function" acceptance).
 *
 * Null semantics (Constitution 16): a comparison whose nullable-number
 * side is null is FALSE — a stock with insufficient consensus data is
 * not "consensus > 50" and also not "consensus <= 50"; it is selected
 * only by `consensus is null` (or `not (consensus is null)`).
 */
import type { QueryNode } from './parser';
import type { SlimStockRow } from '@/lib/scoring/slimIndex';

/** Read a field's value off a row (typed union keeps eval exhaustive). */
function fieldValue(row: SlimStockRow, name: string): number | string | null {
  switch (name) {
    case 'pe':
      return row.pe;
    case 'roe':
      return row.roe;
    case 'mktcap':
      return row.mktcap;
    case 'de':
      return row.de;
    case 'revcagr':
      return row.revcagr;
    case 'fcf':
      return row.fcf;
    case 'consensus':
      return row.consensus;
    case 'tensionSpread':
      return row.tensionSpread;
    case 'symbol':
      return row.symbol;
    case 'name':
      return row.name;
    case 'sector':
      return row.sector;
    case 'category':
      return row.category;
    case 'dataQuality':
      return row.dataQuality;
    default:
      // The parser only admits registered fields, so this is unreachable
      // from parsed queries — but fail CLOSED anyway (Constitution 6).
      throw new Error(`unregistered field: ${name}`);
  }
}

function evalNode(node: QueryNode, row: SlimStockRow): boolean {
  switch (node.kind) {
    case 'bool':
      return node.op === 'and'
        ? evalNode(node.left, row) && evalNode(node.right, row)
        : evalNode(node.left, row) || evalNode(node.right, row);
    case 'not':
      return !evalNode(node.operand, row);
    case 'isnull': {
      const v = fieldValue(row, node.field);
      return node.negated ? v !== null : v === null;
    }
    case 'cmp': {
      const l = evalOperand(node.left, row);
      const r = evalOperand(node.right, row);
      if (typeof l === 'number' || typeof r === 'number') {
        // numeric comparison — null on either side matches nothing
        const ln = typeof l === 'number' ? l : null;
        const rn = typeof r === 'number' ? r : null;
        if (ln === null || rn === null) return false;
        return compare(ln, node.op, rn);
      }
      // string comparison — both sides strings
      const ls = typeof l === 'string' ? l : '';
      const rs = typeof r === 'string' ? r : '';
      return node.op === '=' ? ls === rs : ls !== rs;
    }
    case 'field':
    case 'number':
    case 'string':
      // The parser rejects bare values as conditions; reaching one here
      // means an internal inconsistency — fail closed.
      throw new Error('internal: bare value evaluated as a condition');
  }
}

function evalOperand(node: QueryNode, row: SlimStockRow): number | string | null {
  switch (node.kind) {
    case 'field':
      return fieldValue(row, node.name);
    case 'number':
      return node.value;
    case 'string':
      return node.value;
    default:
      throw new Error('internal: boolean expression used as an operand');
  }
}

function compare(l: number, op: string, r: number): boolean {
  switch (op) {
    case '>':
      return l > r;
    case '>=':
      return l >= r;
    case '<':
      return l < r;
    case '<=':
      return l <= r;
    case '=':
      return l === r;
    case '!=':
      return l !== r;
    default:
      throw new Error(`internal: unknown operator ${op}`);
  }
}

/** Does one row satisfy the parsed query? */
export function rowMatches(node: QueryNode, row: SlimStockRow): boolean {
  return evalNode(node, row);
}

/**
 * Filter a whole universe. Rows keep their input order (deterministic —
 * Constitution 18: no sort or shuffle sneaks in here).
 */
export function filterRows(node: QueryNode, rows: SlimStockRow[]): SlimStockRow[] {
  return rows.filter((row) => evalNode(node, row));
}
