const assert = require('assert');
const fs = require('fs');
const mocha = require('mocha');
const command = require(`../commands/bgg-search`);

let bggSearchResult;
let bggThingResult;
let embed;

mocha.describe('itemToEmbed', function() {
    mocha.before(function(done) {
        fs.readFile(__dirname + '/data/bgg-thing-result.json', 'utf8', function(err, fileContents) {
            if (err) throw err;
            bggThingResult = JSON.parse(fileContents);
            // noinspection JSPotentiallyInvalidTargetOfIndexedPropertyAccess
            embed = command.itemToEmbed(bggThingResult.items.item);
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

mocha.describe('thingIdFromExactSearch', function() {
    mocha.before(function(done) {
        fs.readFile(__dirname + '/data/bgg-search-exact-result.json', 'utf8', function(err, fileContents) {
            if (err) throw err;
            bggSearchResult = JSON.parse(fileContents);
            done();
        });
    });

    mocha.it('thing id should be 131357', function() {
       assert.equal(command.thingIdFromExactSearch(bggSearchResult).thing_id, '131357');
    });
});

mocha.describe('thingIdFromFuzzySearch', function() {
    mocha.before(function(done) {
        fs.readFile(__dirname + '/data/bgg-search-fuzzy-result.json', 'utf8', function(err, fileContents) {
            if (err) throw err;
            bggSearchResult = JSON.parse(fileContents);
            done();
        });
    });

    mocha.it('thing id should be 177736', function() {
        assert.equal(command.thingIdFromFuzzySearch(bggSearchResult).thing_id, '177736');
    });
});