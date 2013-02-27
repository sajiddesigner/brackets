/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */


/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50 */
/*global define: false, describe: false, it: false, expect: false, beforeEach: false, afterEach: false, waitsFor: false, runs: false, $: false, CodeMirror: false */

define(function (require, exports, module) {
    'use strict';
    
    var Editor          = require("editor/Editor").Editor,
        EditorManager   = require("editor/EditorManager"),
        SpecRunnerUtils = require("spec/SpecRunnerUtils"),
        LanguageManager = require("language/LanguageManager");

    describe("Editor", function () {
        var defaultContent = 'Brackets is going to be awesome!\n';
        var myDocument, myEditor;
        
        function createTestEditor(content, mode) {
            // create dummy Document and Editor
            var mocks = SpecRunnerUtils.createMockEditor(content, mode);
            myDocument = mocks.doc;
            myEditor = mocks.editor;
        }

        afterEach(function () {
            if (myEditor) {
                SpecRunnerUtils.destroyMockEditor(myDocument);
                myEditor = null;
                myDocument = null;
            }
        });

        describe("Editor wrapper", function () {
            beforeEach(function () {
                createTestEditor(defaultContent, "");
            });
            
            it("should initialize with content", function () {
                // verify editor content
                expect(myEditor._codeMirror.getValue()).toEqual(defaultContent);
            });
            
            // FUTURE: this should really be in a Document unit test, but there's no "official"
            // way to create the model for a Document without manually creating an Editor, so we're
            // testing this here for now until we get a real central model.
            it("should trigger a synchronous Document change event when an edit is performed", function () {
                var changeFired = false;
                function changeHandler(event, doc, changeList) {
                    $(myDocument).off("change", changeHandler);
                    changeFired = true;
                    expect(doc).toBe(myDocument);
                    expect(changeList.from).toEqual({line: 0, ch: 0});
                    expect(changeList.to).toEqual({line: 1, ch: 0});
                    expect(changeList.text).toEqual(["new content"]);
                    expect(changeList.next).toBe(undefined);
                }
                $(myDocument).on("change", changeHandler);
                myEditor._codeMirror.setValue("new content");
                expect(changeFired).toBe(true);
            });

        });
            
        describe("File extension to mode mapping", function () {
            beforeEach(function () {
                this.addMatchers({
                    toSpecifyModeNamed: function (expected) {
                        if (typeof this.actual === "string") {
                            return this.actual === expected;
                        } else {
                            return this.actual.name === expected;
                        }
                    }
                });
            });
            
            it("should switch to the HTML mode for files ending in .html", function () {
                // verify editor content
                var mode = LanguageManager.getLanguageForFileExtension("file:///only/testing/the/path.html").mode;
                expect(mode).toSpecifyModeNamed("text/x-brackets-html");
            });
            
            it("should switch modes even if the url has a query string", function () {
                // verify editor content
                var mode = LanguageManager.getLanguageForFileExtension("http://only.org/testing/the/path.css?v=2").mode;
                expect(mode).toSpecifyModeNamed("css");
            });
            
            it("should accept just a file name too", function () {
                // verify editor content
                var mode = LanguageManager.getLanguageForFileExtension("path.js").mode;
                expect(mode).toSpecifyModeNamed("javascript");
            });

            it("should default to plaintext for unknown file extensions", function () {
                // verify editor content
                var mode = LanguageManager.getLanguageForFileExtension("test.foo").mode;
                expect(mode).toBe(undefined);
            });
        });
        
        describe("Focus", function () {
            beforeEach(function () {
                createTestEditor(defaultContent, "");
            });
            
            it("should not have focus until explicitly set", function () {
                expect(myEditor.hasFocus()).toBe(false);
            });
            
            it("should be able to detect when it has focus", function () {
                myEditor.focus();
                expect(myEditor.hasFocus()).toBe(true);
            });
        });
        
        describe("getModeForSelection()", function () {
            var jsContent = "var foo;";
            var htmlContent = "<html><head>\n" +
                              "  <script>\n" +
                              "    var bar;\n" +
                              "  </script>\n" +
                              "</head><body>\n" +
                              "  <p>Hello</p>\n" +
                              "</body></html>";
            
            it("should get mode in homogenous file", function () {
                createTestEditor(jsContent, "javascript");
                
                // Mode at point
                myEditor.setCursorPos(0, 0);    // first char in text
                expect(myEditor.getModeForSelection()).toBe("javascript");
                myEditor.setCursorPos(0, 8);    // last char in text
                expect(myEditor.getModeForSelection()).toBe("javascript");
                
                myEditor.setCursorPos(0, 3);    // middle of text
                expect(myEditor.getModeForSelection()).toBe("javascript");
                
                // Mode for range
                myEditor.setSelection({line: 0, ch: 4}, {line: 0, ch: 7});
                expect(myEditor.getModeForSelection()).toBe("javascript");
                myEditor.setSelection({line: 0, ch: 0}, {line: 0, ch: 8});  // select all
                expect(myEditor.getModeForSelection()).toBe("javascript");
            });
            
            it("should get mode in HTML file", function () {
                createTestEditor(htmlContent, "html");
                
                // Mode at point
                myEditor.setCursorPos(0, 0);    // first char in text
                expect(myEditor.getModeForSelection()).toBe("html");
                myEditor.setCursorPos(6, 14);    // last char in text
                expect(myEditor.getModeForSelection()).toBe("html");
                
                myEditor.setCursorPos(5, 7);    // middle of text - html
                expect(myEditor.getModeForSelection()).toBe("html");
                myEditor.setCursorPos(2, 7);    // middle of text - js
                expect(myEditor.getModeForSelection()).toBe("javascript");
                
                // Mode for range - homogenous mode
                myEditor.setSelection({line: 5, ch: 2}, {line: 5, ch: 14});
                expect(myEditor.getModeForSelection()).toBe("html");
                myEditor.setSelection({line: 5, ch: 0}, {line: 6, ch: 0});  // whole line
                expect(myEditor.getModeForSelection()).toBe("html");
                myEditor.setSelection({line: 2, ch: 4}, {line: 2, ch: 12});
                expect(myEditor.getModeForSelection()).toBe("javascript");
                myEditor.setSelection({line: 2, ch: 0}, {line: 3, ch: 0});  // whole line
                expect(myEditor.getModeForSelection()).toBe("javascript");
                
                // Mode for range - mix of modes
                myEditor.setSelection({line: 2, ch: 4}, {line: 3, ch: 7});
                expect(myEditor.getModeForSelection()).toBeNull();
                
                // Mode for range - mix of modes where start & endpoints are same mode
                // Known limitation of getModeForSelection() that it does not spot where the mode
                // differs in mid-selection
                myEditor.setSelection({line: 0, ch: 0}, {line: 6, ch: 14});  // select all
                expect(myEditor.getModeForSelection()).toBe("html");
            });
            
        });
    });
});
