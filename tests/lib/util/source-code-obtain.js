/**
 * @fileoverview Tests for source-code-obtain.
 * @author Ian VanSchooten
 * @copyright 2016 Ian VanSchooten. All rights reserved.
 * See LICENSE in root directory for full license.
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

var path = require("path"),
    fs = require("fs"),
    os = require("os"),
    assert = require("chai").assert,
    sinon = require("sinon"),
    sh = require("shelljs"),
    assign = require("object-assign"),
    sourceCodeObtain = require("../../../lib/util/source-code-obtain"),
    SourceCode = require("../../../lib/util/source-code"),
    defaultOptions = require("../../../conf/cli-options");

var originalDir = process.cwd();

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

describe("SourceCodeObtain", function() {

    var fixtureDir;

    /**
     * Returns the path inside of the fixture directory.
     * @returns {string} The path inside the fixture directory.
     * @private
     */
    function getFixturePath() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(fixtureDir);
        var filepath = path.join.apply(path, args);
        try {
            filepath = fs.realpathSync(filepath);
            return filepath;
        } catch (e) {
            return filepath;
        }
    }

    // copy into clean area so as not to get "infected" by this project's .eslintrc files
    before(function() {
        fixtureDir = os.tmpdir() + "/eslint/fixtures/source-code-obtain";
        sh.mkdir("-p", fixtureDir);
        sh.cp("-r", "./tests/fixtures/source-code-obtain/.", fixtureDir);
        fixtureDir = fs.realpathSync(fixtureDir);
    });

    beforeEach(function() {
        process.chdir(fixtureDir);
    });

    afterEach(function() {
        process.chdir(originalDir);
    });

    after(function() {
        sh.rm("-r", fixtureDir);
    });

    describe("getSourceCodeOfFiles()", function() {

        it("should handle single string filename arguments", function() {
            var filename = getFixturePath("foo.js");
            var sourceCode = sourceCodeObtain.getSourceCodeOfFiles(filename);
            assert.isObject(sourceCode);
        });

        it("should accept an array of string filenames", function() {
            var fooFilename = getFixturePath("foo.js");
            var barFilename = getFixturePath("bar.js");
            var sourceCode = sourceCodeObtain.getSourceCodeOfFiles([fooFilename, barFilename]);
            assert.isObject(sourceCode);
        });

        it("should accept a glob argument", function() {
            var glob = getFixturePath("**/*.js");
            var nestedFilename = getFixturePath("nested", "foo.js");
            var sourceCode = sourceCodeObtain.getSourceCodeOfFiles(glob);
            assert.isObject(sourceCode);
            assert.property(sourceCode, nestedFilename);
        });

        it("should create an object with located filenames as keys", function() {
            var fooFilename = getFixturePath("foo.js");
            var barFilename = getFixturePath("bar.js");
            var sourceCode = sourceCodeObtain.getSourceCodeOfFiles([fooFilename, barFilename]);
            assert.property(sourceCode, fooFilename);
            assert.property(sourceCode, barFilename);
        });

        it("should should not include non-existent filesnames in results", function() {
            var filename = getFixturePath("missing.js");
            var sourceCode = sourceCodeObtain.getSourceCodeOfFiles(filename);
            assert.notProperty(sourceCode, filename);
        });

        it("should should not throw on files with parsing errors", function() {
            var filename = getFixturePath("parse-error.js");
            var sourceCode = sourceCodeObtain.getSourceCodeOfFiles(filename);
            assert.isObject(sourceCode);
        });

        it("should obtain the sourceCode of a file", function() {
            var filename = getFixturePath("foo.js");
            var sourceCode = sourceCodeObtain.getSourceCodeOfFiles(filename);
            assert.isObject(sourceCode);
            assert.instanceOf(sourceCode[filename], SourceCode);
        });

        it("should honor .eslintignore files by default", function() {
            // Setting options is needed because by default cwd is eslint project root,
            // and the fixture .eslintignore file is not used.
            var options = assign({}, defaultOptions, {cwd: process.cwd()});
            var glob = getFixturePath("*.js");
            var unignoredFilename = getFixturePath("foo.js");
            var sourceCode = sourceCodeObtain.getSourceCodeOfFiles(glob, options);
            assert.property(sourceCode, unignoredFilename);
            assert.notProperty(sourceCode, "./tests/fixtures/source-code-obtain/ignored.js");
        });

        it("should obtain the sourceCode of all files in a specified folder", function() {
            var folder = getFixturePath("nested");
            var fooFile = getFixturePath("nested/foo.js");
            var barFile = getFixturePath("nested/bar.js");
            var sourceCode = sourceCodeObtain.getSourceCodeOfFiles(folder);
            assert.equal(Object.keys(sourceCode).length, 2);
            assert.instanceOf(sourceCode[fooFile], SourceCode);
            assert.instanceOf(sourceCode[barFile], SourceCode);
        });

        it("should accept cli options", function() {
            var pattern = getFixturePath("ext");
            var abcFile = getFixturePath("ext/foo.abc");
            var cliOptions = {extensions: [".abc"]};
            var sourceCode = sourceCodeObtain.getSourceCodeOfFiles(pattern, cliOptions);
            assert.equal(Object.keys(sourceCode).length, 1);
            assert.instanceOf(sourceCode[abcFile], SourceCode);
        });

        it("should execute the callback function, if provided", function() {
            var callback = sinon.spy();
            var filename = getFixturePath("foo.js");
            sourceCodeObtain.getSourceCodeOfFiles(filename, callback);
            assert(callback.calledOnce);
        });

        it("should execute callback function once per file", function() {
            var callback = sinon.spy();
            var fooFilename = getFixturePath("foo.js");
            var barFilename = getFixturePath("bar.js");
            sourceCodeObtain.getSourceCodeOfFiles([fooFilename, barFilename], callback);
            assert.equal(callback.callCount, 2);
        });

        it("should call callback function with total number of files with sourceCode", function() {
            var callback = sinon.spy();
            var firstFn = getFixturePath("foo.js");
            var secondFn = getFixturePath("bar.js");
            var thirdFn = getFixturePath("nested/foo.js");
            var missingFn = getFixturePath("missing.js");
            sourceCodeObtain.getSourceCodeOfFiles([firstFn, secondFn, thirdFn, missingFn], callback);
            assert(callback.calledWith(3));
        });

    });

});