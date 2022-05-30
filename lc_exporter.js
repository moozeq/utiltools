/*

[POLSKI]
Żeby wyeksportować swoje książki:

    1. Wejdź na adres swojej biblioteczki (musisz być zalogowany): https://lubimyczytac.pl/biblioteczka
    2. Naciśnij F12 i przejdź do zakładki KONSOLA
    3. Skopiuj cały tekst z tego pliku i wklej go w linii na samym dole, naciśnij ENTER
    4. Poczekaj aż ściągną się wszystkie strony z twoimi książkami
    5. Będziesz mógł pobrać plik w formacie JSON z twoją biblioteką, będą tam tytuły, autorzy, oceny, półki

[ENGLISH]
To use this exporter:

    1. Go to your library (you must be logged in): https://lubimyczytac.pl/biblioteczka
    2. Hit F12 and go to CONSOLE tab
    3. Paste text from this file in the line at the bottom and hit ENTER
    4. Wait for all pages to be scrapped
    5. File in JSON format with all your books, ratings, shelves will be available to download

 */

class Book {
    constructor(name, author, rate, opinion, read_date, shelves, average_rate) {
        this.name = name;
        this.author = author;
        this.read_date = read_date;
        this.rate = rate;
        this.opinion = opinion;
        this.average_rate = average_rate;
        this.shelves = shelves;
    }
}

function getPagesCount() {
    return Math.max(
        ...Array.from(document.querySelectorAll('[data-page]'))
            .map(page => page.getAttribute('data-page')).filter(pageNum => /^\d+$/.test(pageNum))
            .map(pageNum => parseInt(pageNum))
    );
}

// Function to download data to a file.
// https://stackoverflow.com/questions/13405129/javascript-create-and-save-file
function download(data, filename, type) {
    var file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

async function importBooksAPI() {
    const pagesCount = getPagesCount();
    const objId = document.querySelector('#objectId').value;

    let pagesNums = Array.from({length: pagesCount}, (_, i) => i + 1);
    let promises = pagesNums.map(async (pageNum) => {
        const response = await fetch("https://lubimyczytac.pl/profile/getLibraryBooksList", {
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Csrf-Token': document.querySelector('meta[name="csrf-token"]').content,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: `page=${pageNum}&listId=booksFilteredList&showFirstLetter=0&paginatorType=Standard&porzadek=malejaco&own=1&objectId=${objId}&own=1&paginatorType=Standard`
        });
        const books = await response.json();
        let parser = new DOMParser();
        return parser.parseFromString(books.data.content, 'text/html');
    });
    let books = [];
    let pages = await Promise.all(promises);
    pages.forEach(htmlPage => {
        // extract all info about books
        Array.from(htmlPage.querySelectorAll(".authorAllBooks__single")).forEach(bookNode => {
            const title = bookNode.querySelector(".authorAllBooks__singleTextTitle")
                ?.innerHTML?.trim();
            const author = bookNode.querySelector(".authorAllBooks__singleTextAuthor")
                ?.firstChild?.innerHTML?.trim();
            const shelves = Array.from(bookNode.querySelectorAll(".authorAllBooks__singleTextShelfRight a"))
                .map(shelf => shelf?.innerHTML.trim());
            const rates = Array.from(bookNode.querySelectorAll(".listLibrary__ratingStarsNumber"))
                .map(rate => rate?.innerHTML.trim());
            let opinion; // try to get opinion if added
            try {
                opinion = bookNode.querySelector('.comment-cloud__body .p-collapsed')
                    ?.innerHTML?.trim();
            } catch (e) {
                opinion = '';
            }
            let readDate; // try to get read date if set
            try {
                readDate = bookNode.querySelector(".authorAllBooks__singleImg div")?.innerHTML?.split('<br>')[1]?.trim();
            } catch (e) {
                readDate = '';
            }
            books.push(new Book(title, author, rates[0], opinion, readDate, shelves, rates[1]));
        });
    });
    return books;
}

download(JSON.stringify(await importBooksAPI(), null, 4), 'lc_books.json', 'json');
