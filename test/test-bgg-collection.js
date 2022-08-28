const assert = require('assert');
const fs = require('fs');
const mocha = require('mocha');
const command = require(`../commands/bgg-collection`);

let bggCollectionResult;
let embed;
let user = {
    username: 'Jesmaster',
    avatarURL: () => null,
    displayAvatarURL: () => null,
};

mocha.describe('collectionToEmbed', function() {
    mocha.before(function(done) {
        fs.readFile(__dirname + '/data/bgg-collection-result.json', 'utf8', function(err, fileContents) {
            if (err) throw err;
            bggCollectionResult = JSON.parse(fileContents);
            // noinspection JSPotentiallyInvalidTargetOfIndexedPropertyAccess
            embed = command.collectionToEmbed(bggCollectionResult, 'jesmaster', user).toJSON();
            done();
        });
    });

    mocha.it('title should be jesmaster\'s collection', function() {
        assert.equal(embed.title, 'jesmaster\'s collection');
    });

    mocha.it('url should be https://boardgamegeek.com/collection/user/jesmaster', function() {
        assert.equal(embed.url, 'https://boardgamegeek.com/collection/user/jesmaster');
    });

    mocha.it('owned should be 85', function() {
       assert.equal(embed.fields[1].value, 85);
    });
});