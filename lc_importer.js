/*
To use this importer:

    1. Go to your library: https://lubimyczytac.pl/biblioteczka
    2. Hit F12
    3. Paste text from this file and hit Enter
    4. Wait for all pages to be scrapped.
    5. File in JSON format with all your library will available to download.

 */

class Book {
    constructor(name, author, rate, read_date, shelves, average_rate) {
        this.name = name;
        this.author = author;
        this.read_date = read_date;
        this.rate = rate;
        this.average_rate = average_rate;
        this.shelves = shelves;
    }
}

function delay(n) {
    return new Promise(function (resolve) {
        setTimeout(resolve, n * 1000);
    });
}

function getPagesCount() {
    return Math.max(
        ...Array.from(document.querySelectorAll('[data-page]'))
            .map(page => page.getAttribute('data-page')).filter(pageNum => /^\d+$/.test(pageNum))
            .map(pageNum => parseInt(pageNum))
    );
}

function nextPage() {
    document.querySelector('[aria-label="Next"]').click();
}

// Function to download books from lc.
async function importBooks() {
    const pagesCount = getPagesCount();
    let books = [];

    for (let i = 0; i < pagesCount; ++i) {
        // extract all info about books
        Array.from(document.querySelectorAll(".authorAllBooks__single")).forEach(bookNode => {
            const title = bookNode.querySelector(".authorAllBooks__singleTextTitle")
                .innerHTML.trim();
            const author = bookNode.querySelector(".authorAllBooks__singleTextAuthor")
                .firstChild.innerHTML.trim();
            const shelves = Array.from(bookNode.querySelectorAll(".authorAllBooks__singleTextShelfRight a"))
                .map(shelf => shelf.innerHTML.trim());
            const rates = Array.from(bookNode.querySelectorAll(".listLibrary__ratingStarsNumber"))
                .map(rate => rate.innerHTML.trim());
            let readDate; // try to get read date if set
            try {
                readDate = bookNode.querySelector(".authorAllBooks__singleImg div").innerHTML.split('<br>')[1].trim();
            } catch (e) {
                readDate = '';
            }
            books.push(new Book(title, author, rates[0], readDate, shelves, rates[1]));
        });
        console.log(`Page ${i + 1}, scrapped = ${books.length} books.`);
        nextPage();
        await delay(5);
    }
    return books;
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

download(JSON.stringify(await importBooks(), null, 4), 'lc_books.json', 'json');
