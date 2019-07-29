# coc-sql

SQL extension for coc.nvim

## Features

- Format by [sql-formatter](https://github.com/zeroturnaround/sql-formatter)

## Install

`:CocInstall coc-sql`

## Commands

- `sql.Format` for current file

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
