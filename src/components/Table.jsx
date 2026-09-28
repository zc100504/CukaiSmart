import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

/**
 * columns: [{ key, header, align?: 'right', sortable?: boolean, render?: (row) => node }]
 * onRowClick makes rows focusable and keyboard-activatable (Enter / Space).
 * Sorting is controlled: pass sort = { key, dir: 'asc'|'desc' } and onSort(key); rows arrive already sorted.
 */
export default function Table({
  columns,
  rows,
  rowKey = 'id',
  onRowClick,
  rowLabel,
  emptyMessage = 'No records found.',
  caption,
  sort,
  onSort,
}) {
  const clickable = Boolean(onRowClick);

  const handleKeyDown = (e, row) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick(row);
    }
  };

  const headerCell = (col) => {
    if (!col.sortable || !onSort) return col.header;
    const active = sort?.key === col.key;
    const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <button type="button" className={`table__sort ${active ? 'is-active' : ''}`} onClick={() => onSort(col.key)}>
        {col.header}
        <Icon size={14} aria-hidden="true" />
      </button>
    );
  };

  const ariaSort = (col) => {
    if (!col.sortable || !onSort) return undefined;
    if (sort?.key !== col.key) return 'none';
    return sort.dir === 'asc' ? 'ascending' : 'descending';
  };

  return (
    <div className="table-wrap">
      <table className={`table ${clickable ? 'table--clickable' : ''}`}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={col.align === 'right' ? 'num' : undefined}
                aria-sort={ariaSort(col)}
              >
                {headerCell(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table__empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row[rowKey]}
                onClick={clickable ? () => onRowClick(row) : undefined}
                onKeyDown={clickable ? (e) => handleKeyDown(e, row) : undefined}
                tabIndex={clickable ? 0 : undefined}
                aria-label={clickable && rowLabel ? rowLabel(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.align === 'right' ? 'num' : undefined}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
