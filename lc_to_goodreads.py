#!/usr/bin/env python3
"""
Convert JSON file from `lc_exporter.js` to CSV file with appropriate
format to import in Goodreads at https://www.goodreads.com/review/import.
"""
import json
import argparse
from datetime import date

GR_FILE_HEADER = """Title, Author, ISBN, My Rating, Average Rating, Publisher, Binding, Year Published, Original Publication Year, Date Read, Date Added, Shelves, Bookshelves, My Review"""


def convert_shelf(shelf: str) -> str:
    shelves_map = {
        'Przeczytane': 'read',
        'Teraz czytam': 'currently-reading',
        'Chcę przeczytać': 'to-read'
    }
    return shelves_map.get(shelf, '')


def get_read_date(r_date: str, shelf: str, def_r_date: str) -> str:
    if shelf != 'read':
        return ''
    elif not r_date:
        return def_r_date
    else:
        return r_date if len(r_date) > 4 else f'{r_date}-01-01'


def norm_isbn(isbn: str) -> str:
    """Normalize ISBN."""
    return isbn.replace('-', '')


def to_string(*attrs) -> str:
    return ','.join(f'"{attr}"' for attr in attrs)


def convert_to_strings(json_file: str, def_read_date: str) -> list[str]:
    """Convert JSON file to list of string for CSV file."""

    with open(json_file, encoding='utf-8') as f:
        books = json.load(f)

    return [
        to_string(
            book['name'],
            book['author'],
            isbn,
            int(float(book['rate'].replace(',', '.')) / 2),
            '',
            '',
            '',
            '',
            '',
            get_read_date(book['read_date'], convert_shelf(book['shelves'][0]), def_read_date),
            str(date.today()),
            # Only one shelf is available ATM.
            convert_shelf(book['shelves'][0]),
            '',
            book['opinion']
        )
        for book in books
        if (isbn := norm_isbn(book['isbn'])) and isbn != '000000000000'
    ]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Convert JSON file from `lc_exporter.js` to CSV file for Goodreads.')
    parser.add_argument('file', help='JSON file from `lc_exporter.js`.')
    parser.add_argument('--def-date', type=str, default=str(date.today()),
                        help='Default date if there is not date provided for read books.')
    parser.add_argument('--out', type=str, help='Output CSV filename.')

    args = parser.parse_args()
    books_as_strings = convert_to_strings(args.file, args.def_date)
    books_as_strings = [bs for bs in books_as_strings if bs]
    base_filename = args.file[:-len('.json')]
    out_filename = args.out if args.out else f'{base_filename}.csv'
    with open(out_filename, 'w', encoding='utf-8') as f:
        f.writelines('\n'.join([GR_FILE_HEADER, *books_as_strings]))
