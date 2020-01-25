module.exports = {
    prod: {
        albireo_host: process.env.ALBIREO_HOST || 'https://localhost:3000',
        extension_name: process.env.EXTENSION_NAME || 'Bangumi for Deneb',
        extension_description: process.env.EXTENSION_DESCRIPTION || 'Add bangumi feature for Deneb, including watch progress synchronizing, comment, rating.',
        extension_id:  process.env.EXTENSION_ID || 'sadr@example.com',
        firefox_update_link: process.env.FIREFOX_UPDATE_LINK || 'https://example.com/updates.json' // update link to firefox, must be a secured (HTTPS) server
    },
    dev: {
        albireo_host: process.env.ALBIREO_HOST || 'http://localhost:3000',
        extension_id: process.env.EXTENSION_ID || 'sadr@example.com'
    }
};