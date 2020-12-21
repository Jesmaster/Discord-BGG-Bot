const assert = require('assert');
const fs = require('fs');
const mocha = require('mocha');
const command = require(`../commands/bgg-search`);

let bggSearchResult;
let bggThingResult;
let embed;
let user = {
    username: 'Jesmaster',
    avatarURL: function() {
        return '';
    }
}

mocha.describe('itemToSearchEmbed', function() {
    mocha.before(function(done) {
        fs.readFile(__dirname + '/data/bgg-thing-result.json', 'utf8', function(err, fileContents) {
            if (err) throw err;
            bggThingResult = JSON.parse(fileContents);
            // noinspection JSPotentiallyInvalidTargetOfIndexedPropertyAccess
            embed = command.itemToSearchEmbed(bggThingResult.items.item, user);
            done();
        });
    });

    mocha.it('title should be A Feast for Odin: The Norwegians', function() {
        assert.equal(embed.title, 'A Feast for Odin: The Norwegians');
    });

    mocha.it('url should be https://boardgamegeek.com/boardgameexpansion/216788', function() {
        assert.equal(embed.url, 'https://boardgamegeek.com/boardgameexpansion/216788');
    });
});

mocha.describe('thingIdFromBggSearch', function() {
    mocha.before(function(done) {
        fs.readFile(__dirname + '/data/bgg-search-result.json', 'utf8', function(err, fileContents) {
            if (err) throw err;
            bggSearchResult = JSON.parse(fileContents);
            done();
        });
    });

    mocha.it('thing id should be 1653', function() {
       assert.equal(command.thingIdFromBggSearchCall(bggSearchResult).thing_id, '28720');
    });
});