# coc-sql

SQL extension for coc.nvim

## Features

- Format by [sql-formatter](https://github.com/zeroturnaround/sql-formatter)
- Lint by [node-sql-parser](https://github.com/taozhi8833998/node-sql-parser)

## Install

`:CocInstall coc-sql`

## Commands

- `sql.Format` for current file

## Configuration

- `sql.lintOnOpen`: Lint sql file on opening, default `true`
- `sql.lintOnChange`: Lint sql file on change, default `true`
- `sql.lintOnSave`: Lint sql file on save, default `true`
- `sql.database`: Choose the database syntax flavor, default to `guess`
- `sql.formatOptions`: Format options passed to `sql-formatter`, checkout <https://github.com/zeroturnaround/sql-formatter>

## Usage

### Format document

- `:call CocAction('format')`
- `:CocCommand sql.Format`

### Format selected content

```vim
xmap <leader>f  <Plug>(coc-format-selected)
nmap <leader>f  <Plug>(coc-format-selected)
```

## License

MIT
