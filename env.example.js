module.exports = {
    prod: {
        albireo_host: 'https://localhost:3000', // should match your Albireo instance address
        extension_name: 'Bangumi for Deneb',
        extension_description: 'Add bangumi feature for Deneb, including watch progress synchronizing, comment, rating.',
        extension_id: 'sadr@example.com', // must be modified when publishing
        firefox_update_link: 'https://example.com/' // update link to firefox
    },
    dev: {
        albireo_host: 'http://localhost:3000',
        extension_id: 'sadr@example.com' // should be different with the dev id
    }
};