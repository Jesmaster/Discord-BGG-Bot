const assert = require('assert');
const fs = require('fs');
const mocha = require('mocha');
const command = require(`../commands/bgg-search`);

let bggThingResult;
let embed;

mocha.describe('itemToEmbed', function() {
    mocha.before(function(done) {
        fs.readFile(__dirname + '/data/bgg-thing-result.json', 'utf8', function(err, fileContents) {
            if (err) throw err;
            bggThingResult = JSON.parse(fileContents);
            // noinspection JSPotentiallyInvalidTargetOfIndexedPropertyAccess
            embed = command.itemToEmbed(bggThingResult.items.item[0]);
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