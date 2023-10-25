class APIFilters {
    constructor(query, queryStr) {
        this.query = query;
        this.queryStr = queryStr;
    }

    filter() {
        const queryCopy = { ... this.queryStr };

        // Removing fields that are not used to filter
        const fieldsToRemove = ['sort', 'fields', 'q', 'limit', 'page'];
        fieldsToRemove.forEach(el => delete queryCopy[el]);

        // Advanced filters using comparisons
        let queryStr = JSON.stringify(queryCopy);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    sort() {
        if (this.queryStr.sort) {
            const sortBy = this.queryStr.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        } else {
            this.query = this.query.sort('-postingDate');
        }

        return this;
    }

    limitFields() {
        if (this.queryStr.fields) {
            const fields = this.queryStr.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else {
            // By default show every field except __v
            this.query = this.query.select('-__v');
        }

        return this;
    }

    searchByQuery() {
        if (this.queryStr.q) {
            const q = this.queryStr.q.split('-').join(' ');
            this.query = this.query.find({ $text: { $search: "\"" + q + "\"" } });
        }

        return this;
    }

    paginate() {
        const page = parseInt(this.queryStr.page, 10) || 1;
        const limit = parseInt(this.queryStr.limit, 10) || 10;
        const skipResults = (page - 1) * limit;

        this.query = this.query.skip(skipResults).limit();

        return this;
    }
}

module.exports = APIFilters;