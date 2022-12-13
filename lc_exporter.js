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
    constructor(name = '',
                author = '',
                rate = 0,
                opinion = '',
                read_date = '',
                shelves = [],
                average_rate = 0,
                href = '',
                isbn = '') {
        this.name = name;
        this.author = author;
        this.read_date = read_date;
        this.rate = rate;
        this.opinion = opinion;
        this.average_rate = average_rate;
        this.shelves = shelves;
        this.href = href
        this.isbn = isbn
    }
}

function getPagesCount() {
    return parseInt(document.querySelector('.paginationList__info span').textContent.trim());
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

async function getBooksDetails(hrefs) {
    let promises = hrefs.map(async (href) => {
        const response = await fetch(href, {
            method: "GET",
            headers: {
                'Content-Type': 'text/html; charset=UTF-8'
            }
        });
        const bookPage = await response.text();
        let parser = new DOMParser();
        return parser.parseFromString(bookPage, 'text/html');
    });
    let booksDetails = {}
    let booksPages = await Promise.all(promises);
    booksPages.forEach(bookPage => {
        const href = bookPage.querySelector('meta[property="og:url"]')?.content
        booksDetails[href] = {
            'isbn': bookPage.querySelector('meta[property="books:isbn"]')?.content,
            'author': bookPage.querySelector('meta[property="books:author"]')?.content,
            'rating': parseInt(bookPage.querySelector('meta[property="books:rating:value"]')?.content),
            'href': href
        }
    })
    return booksDetails;
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
    let books = {};
    let pages = await Promise.all(promises);
    pages.forEach(htmlPage => {
        // extract all info about books
        Array.from(htmlPage.querySelectorAll(".authorAllBooks__single")).forEach(bookNode => {
            const title = bookNode.querySelector(".authorAllBooks__singleTextTitle")
                ?.innerHTML?.trim();
            const href = bookNode.querySelector(".authorAllBooks__singleTextTitle")
                ?.href;
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
            books[href] = new Book(title, author, rates[0], opinion, readDate, shelves, rates[1], href);
        });
    });

    // Get book details, including ISBN and add them for the books.
    let booksDetails = await getBooksDetails(Object.keys(books));
    for (const [href, details] of Object.entries(booksDetails)) {
        books[href].isbn = details.isbn;
    }
    return Object.values(books);
}

download(JSON.stringify(await importBooksAPI(), null, 4), 'lc_books.json', 'json');