#!/usr/bin/env python3
import argparse
import logging
import shutil
from pathlib import Path
from typing import List, Dict, Set
import filecmp


def load_logger(verbosity: int):
    try:
        log_level = {
            0: logging.ERROR,
            1: logging.WARN,
            2: logging.INFO}[verbosity]
    except KeyError:
        log_level = logging.DEBUG
    logger = logging.getLogger()
    logger.setLevel(log_level)


def find_next_filename(org_file: Path, current_files: Set[str]) -> str:
    """Find next unique filename."""
    i = 1
    while True:
        next_filename = f'{org_file.stem}_{i}{org_file.suffix}'
        if next_filename not in current_files:
            logging.debug(f'Found next filename: {next_filename}')
            return next_filename
        i += 1


def get_files_mapping(file_dirs: List[str]) -> Dict[str, Path]:
    """Get files filename to path mapping."""
    dirs = [Path(path) for path in file_dirs]
    logging.info(f'Directories with files to be merged: {dirs}')
    files = [
        Path(file_path)
        for dir_path in dirs
        for file_path in dir_path.rglob('*')
    ]
    size = sum(file_path.stat().st_size for file_path in files)
    logging.info(f'Files found in {len(dirs)} directories = {len(files)} (size = {size // 10**6} MB)')
    files_mapping = {}
    duplicates = []

    for file_path in files:
        if (file_name := file_path.name) in files_mapping:
            file_in_map = files_mapping[file_path.name]
            if filecmp.cmp(file_in_map, file_path, shallow=False):
                logging.debug(f'Same file in "{str(file_in_map)}" == "{str(file_path)}"')
                duplicates.append(str(file_path))
                continue
            file_name = find_next_filename(file_in_map, set(files_mapping.keys()))

        files_mapping[file_name] = file_path
    logging.debug(f'Duplicates ({len(duplicates)}): {duplicates}')
    next_size = sum(file_path.stat().st_size for file_path in files_mapping.values())
    logging.info(f'Change in files = {len(duplicates)} duplicates, '
                 f'{len(files)} ({size // 10**6} MB) -> '
                 f'{len(files_mapping)} ({next_size // 10**6} MB) '
                 f'({next_size / size * 100.0:.2f}%)')
    return files_mapping


def copy_files(files_mapping: Dict[str, Path], output_dir: str):
    """Copy files."""
    copied_files = 0
    copied_files_size = 0
    (output_dir_path := Path(output_dir)).mkdir(parents=True, exist_ok=True)

    # Filter out files from mapping which exists.
    files_mapping = {
        filename: file_path
        for filename, file_path in files_mapping.items()
        if not Path(output_dir_path.joinpath(filename)).exists()
    }

    # Calculate size of all files to be copied.
    all_files_size = sum(file_path.stat().st_size for file_path in files_mapping.values())

    # Copy unique files which don't exist in output directory.
    for filename, file_path in files_mapping.items():
        output_path = output_dir_path.joinpath(filename)
        logging.debug(f'Copying file: "{str(file_path)}" -> "{output_path}"')
        shutil.copy(file_path, output_path)
        copied_files += 1
        copied_files_size += file_path.stat().st_size
        if copied_files % 100 == 0:
            logging.info(f'Copied {copied_files} files ({copied_files_size // 10**6}/{all_files_size // 10**6}) MB')

    logging.info(f'Copied {copied_files} files ({copied_files_size // 10 ** 6}/{all_files_size // 10 ** 6}) MB')


def remove_directories(file_dirs: List[str]):
    for file_dir in file_dirs:
        shutil.rmtree(file_dir)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Merge files to one directory and remove duplicates.')
    parser.add_argument('directories', nargs='+', default=[], help='Directories with files to be merged.')
    parser.add_argument('--out', type=str, default='merged', help='Output directory.')
    parser.add_argument('--rm', action='store_true', help='Remove directories after merge.')
    parser.add_argument('-v', '--verbose', action='count', default=0, help='Increase verbosity.')
    args = parser.parse_args()
    load_logger(args.verbose)

    p_map = get_files_mapping(args.directories)
    copy_files(p_map, args.out)
    if args.rm:
        remove_directories(args.directories)
