// ==UserScript==
// @name         Tyml Syntax Highlighter
// @namespace    http://tyml.org/
// @version      0.1
// @description  Provider Syntax Highlighting for Tyml files on Github
// @author       Henning Dieterichs
// @match        https://github.com/*
// @grant          GM_addStyle
// ==/UserScript==
GM_addStyle("\n    .token.Invalid {\n        color: red;\n    }\n    .token.HeredocStringDelimiter, .token.HeredocStringStart1, .token.HeredocStringStart2, .token.HeredocStringEnd1, .token.HeredocStringEnd2 {\n        color: rgb(87, 87, 87)\n    }\n    .token.HeredocStringEscapeSeq {\n    }\n    .token.HeredocString {\n        color: rgb(3, 57, 202)\n    }\n    .token.StringStart {\n    }\n    .token.StringEnd {\n    }\n    .token.StringText {\n        color: rgb(3, 57, 202)\n    }\n    .token.ArrayStart {\n    }\n    .token.ArrayEnd {\n    }\n    .token.MarkupArrayStart {\n    }\n    .token.MarkupArrayEnd {\n    }\n    .token.MarkupString {\n        color: rgb(88, 120, 170)\n    }\n    .token.CommentStart1 {\n        color: rgb(8, 203, 0)\n    }\n    .token.CommentDelimiter {\n        color: rgb(8, 203, 0)\n    }\n    .token.CommentStart2 {\n        color: rgb(8, 203, 0)\n    }\n    .token.CommentEnd1 {\n        color: rgb(8, 203, 0)\n    }\n    .token.CommentEnd2 {\n        color: rgb(8, 203, 0)\n    }\n    .token.Comment {\n        color: rgb(8, 203, 0)\n    }\n    .token.TypePrefix {\n        color: rgb(73, 175, 175)\n    }\n    .token.TypeName {\n        color: rgb(43, 145, 175)\n    }\n    .token.ObjectStart {\n    }\n    .token.ObjectEnd {\n    }\n    .token.AttributePrefix {\n        color: rgb(253, 151, 31)\n    }\n    .token.PrefixSeparator {\n    }\n    .token.AttributeName {\n        color: rgb(233, 131, 11)\n    }\n    .token.AttributeColon {\n    }\n    .token.EscapeSeqStart {\n    }\n    .token.EscapeSeq {\n    }\n    .token.Invalid {\n    }\n    .token.Primitive {\n        color: rgb(214, 49, 217)\n    }\n");
function readWhitespace(buffer, end, pos) {
    var startPos = pos;
    while (pos < end) {
        if (buffer[pos] == ' ' || buffer[pos] == '\t' || buffer[pos] == '\n' || buffer[pos] == '\r') {
            pos++;
        }
        else
            break;
    }
    return { newPos: pos, successful: startPos != pos, needMoreLookahead: false };
}
function readOptionalIdentifier(buffer, end, pos) {
    var start = pos;
    while (pos < end) {
        if (pos != start && ('0' <= buffer[pos] && buffer[pos] <= '9')) {
            pos++;
        }
        else if (('a' <= buffer[pos] && buffer[pos] <= 'z') || ('A' <= buffer[pos] && buffer[pos] <= 'Z')) {
            pos++;
        }
        else
            break;
    }
    return { newPos: pos, successful: true, needMoreLookahead: pos == end };
}
function readRequiredIdentifier(buffer, end, pos) {
    var startPos = pos;
    var result = readOptionalIdentifier(buffer, end, pos);
    return { newPos: result.newPos, successful: result.newPos != startPos, needMoreLookahead: result.needMoreLookahead };
}
function readPrimitive(buffer, end, pos) {
    var start = pos;
    while (pos < end) {
        if (('a' <= buffer[pos] && buffer[pos] <= 'z') || ('A' <= buffer[pos] && buffer[pos] <= 'Z') || ('0' <= buffer[pos] && buffer[pos] <= '9') || buffer[pos] == '.') {
            pos++;
        }
        else
            break;
    }
    return { newPos: pos, successful: start != pos, needMoreLookahead: pos == end };
}
function readMatchIdentifier(buffer, end, pos, identifier) {
    var strOffset = 0;
    var startPos = pos;
    while (pos < end) {
        if (identifier == null || strOffset >= identifier.length)
            return { successful: true, needMoreLookahead: false, newPos: pos };
        if (buffer[pos] != identifier[strOffset])
            return { successful: false, needMoreLookahead: false, newPos: startPos };
        pos++;
        strOffset++;
    }
    return { successful: false, needMoreLookahead: true, newPos: startPos };
}
function readEscape(buffer, end, pos) {
    if (end == pos)
        return { successful: true, needMoreLookahead: true, newPos: pos };
    return { successful: true, needMoreLookahead: false, newPos: pos + 1 };
}
function readLineBreak(buffer, end, pos) {
    return { successful: false, needMoreLookahead: false, newPos: pos };
}
var TokenType;
(function (TokenType) {
    TokenType[TokenType["Whitespace"] = 0] = "Whitespace";
    TokenType[TokenType["HeredocStringStart1"] = 1] = "HeredocStringStart1";
    TokenType[TokenType["HeredocStringDelimiter"] = 2] = "HeredocStringDelimiter";
    TokenType[TokenType["HeredocStringStart2"] = 3] = "HeredocStringStart2";
    TokenType[TokenType["HeredocStringEnd1"] = 4] = "HeredocStringEnd1";
    TokenType[TokenType["HeredocStringEnd2"] = 5] = "HeredocStringEnd2";
    TokenType[TokenType["HeredocStringEscapeSeq"] = 6] = "HeredocStringEscapeSeq";
    TokenType[TokenType["HeredocString"] = 7] = "HeredocString";
    TokenType[TokenType["StringStart"] = 8] = "StringStart";
    TokenType[TokenType["StringEnd"] = 9] = "StringEnd";
    TokenType[TokenType["StringText"] = 10] = "StringText";
    TokenType[TokenType["ArrayStart"] = 11] = "ArrayStart";
    TokenType[TokenType["ArrayEnd"] = 12] = "ArrayEnd";
    TokenType[TokenType["MarkupArrayStart"] = 13] = "MarkupArrayStart";
    TokenType[TokenType["MarkupArrayEnd"] = 14] = "MarkupArrayEnd";
    TokenType[TokenType["MarkupString"] = 15] = "MarkupString";
    TokenType[TokenType["CommentStart1"] = 16] = "CommentStart1";
    TokenType[TokenType["CommentDelimiter"] = 17] = "CommentDelimiter";
    TokenType[TokenType["CommentStart2"] = 18] = "CommentStart2";
    TokenType[TokenType["CommentEnd1"] = 19] = "CommentEnd1";
    TokenType[TokenType["CommentEnd2"] = 20] = "CommentEnd2";
    TokenType[TokenType["Comment"] = 21] = "Comment";
    TokenType[TokenType["TypePrefix"] = 22] = "TypePrefix";
    TokenType[TokenType["TypeName"] = 23] = "TypeName";
    TokenType[TokenType["ObjectStart"] = 24] = "ObjectStart";
    TokenType[TokenType["ObjectCast"] = 25] = "ObjectCast";
    TokenType[TokenType["ObjectInference"] = 26] = "ObjectInference";
    TokenType[TokenType["ObjectEnd"] = 27] = "ObjectEnd";
    TokenType[TokenType["AttributePrefix"] = 28] = "AttributePrefix";
    TokenType[TokenType["PrefixSeparator"] = 29] = "PrefixSeparator";
    TokenType[TokenType["AttributeName"] = 30] = "AttributeName";
    TokenType[TokenType["AttributeColon"] = 31] = "AttributeColon";
    TokenType[TokenType["EscapeSeqStart"] = 32] = "EscapeSeqStart";
    TokenType[TokenType["EscapeSeq"] = 33] = "EscapeSeq";
    TokenType[TokenType["Invalid"] = 34] = "Invalid";
    TokenType[TokenType["Primitive"] = 35] = "Primitive";
})(TokenType || (TokenType = {}));
var Tokenizer = (function () {
    function Tokenizer() {
    }
    Tokenizer.Tokenize = function (state, buffer, offset, length, endWithEof, tokens) {
        var end = offset + length;
        var lastWasAmbientToken = false;
        var needMoreLookahead = false;
        if (!state || !state.stack) {
            state = { stack: [], identifier: undefined };
        }
        var stack = state.stack;
        var currentState = stack.length > 0 ? stack.pop() : 0;
        var pos = offset;
        var pos0 = pos, pos1 = pos, pos2 = pos, pos3 = pos, pos4 = pos;
        var result;
        while (true) {
            checkCurrentState: switch (currentState) {
                case 0:
                    pos0 = pos;
                    result = readWhitespace(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof) {
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        stack.push(0); // push root
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful) {
                        pos = result.newPos;
                        pos1 = pos;
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        tokens.push({ type: TokenType.Whitespace, isMissing: false, endPos: pos1 });
                        currentState = 0;
                        break checkCurrentState;
                    }
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                            }
                            stack.push(0); // push root
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else
                        switch (buffer[pos]) {
                            case '<':
                                pos++;
                                pos1 = pos;
                                result = readOptionalIdentifier(buffer, end, pos);
                                if (result.needMoreLookahead && !endWithEof) {
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                    }
                                    stack.push(0); // push root
                                    return pos0 - offset; // tokenized count
                                }
                                if (result.successful) {
                                    pos = result.newPos;
                                    pos2 = pos;
                                    if (pos >= end) {
                                        if (!endWithEof) {
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                            }
                                            stack.push(0); // push root
                                            return pos0 - offset; // tokenized count
                                        }
                                    }
                                    else if (buffer[pos] === '<') {
                                        pos++;
                                        pos3 = pos;
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                        }
                                        tokens.push({ type: TokenType.HeredocStringStart1, isMissing: false, endPos: pos1 });
                                        tokens.push({ type: TokenType.HeredocStringDelimiter, isMissing: false, endPos: pos2 });
                                        tokens.push({ type: TokenType.HeredocStringStart2, isMissing: false, endPos: pos3 });
                                        state.identifier = buffer.substring(pos1, pos2);
                                        stack.push(0); // push root
                                        currentState = 5;
                                        break checkCurrentState;
                                    }
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                    }
                                    tokens.push({ type: TokenType.StringStart, isMissing: false, endPos: pos1 });
                                    lastWasAmbientToken = true;
                                    stack.push(0); // push root
                                    currentState = 6;
                                    break checkCurrentState;
                                }
                                pos = pos1;
                                break;
                            case '{':
                                pos++;
                                pos1 = pos;
                                if (pos >= end) {
                                    if (!endWithEof) {
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                        }
                                        stack.push(0); // push root
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else
                                    switch (buffer[pos]) {
                                        case '-':
                                            pos++;
                                            pos2 = pos;
                                            result = readOptionalIdentifier(buffer, end, pos);
                                            if (result.needMoreLookahead && !endWithEof) {
                                                if (lastWasAmbientToken) {
                                                    lastWasAmbientToken = false;
                                                    tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                                }
                                                stack.push(0); // push root
                                                return pos0 - offset; // tokenized count
                                            }
                                            if (result.successful) {
                                                pos = result.newPos;
                                                pos3 = pos;
                                                if (pos >= end) {
                                                    if (!endWithEof) {
                                                        if (lastWasAmbientToken) {
                                                            lastWasAmbientToken = false;
                                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                                        }
                                                        stack.push(0); // push root
                                                        return pos0 - offset; // tokenized count
                                                    }
                                                }
                                                else if (buffer[pos] === '-') {
                                                    pos++;
                                                    pos4 = pos;
                                                    if (lastWasAmbientToken) {
                                                        lastWasAmbientToken = false;
                                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                                    }
                                                    tokens.push({ type: TokenType.CommentStart1, isMissing: false, endPos: pos2 });
                                                    tokens.push({ type: TokenType.CommentDelimiter, isMissing: false, endPos: pos3 });
                                                    tokens.push({ type: TokenType.CommentStart2, isMissing: false, endPos: pos4 });
                                                    state.identifier = buffer.substring(pos2, pos3);
                                                    stack.push(0); // push root
                                                    currentState = 7;
                                                    break checkCurrentState;
                                                }
                                                pos = pos3;
                                            }
                                            pos = pos2;
                                            break;
                                        case '=':
                                            pos++;
                                            pos2 = pos;
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                            }
                                            tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                            tokens.push({ type: TokenType.ObjectCast, isMissing: false, endPos: pos2 });
                                            stack.push(0); // push root
                                            currentState = 2;
                                            break checkCurrentState;
                                        case '$':
                                            pos++;
                                            pos2 = pos;
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                            }
                                            tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                            tokens.push({ type: TokenType.ObjectInference, isMissing: false, endPos: pos2 });
                                            stack.push(0); // push root
                                            currentState = 1;
                                            break checkCurrentState;
                                    }
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                }
                                tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                stack.push(0); // push root
                                currentState = 2;
                                break checkCurrentState;
                            case '[':
                                pos++;
                                pos1 = pos;
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                }
                                tokens.push({ type: TokenType.ArrayStart, isMissing: false, endPos: pos1 });
                                stack.push(0); // push root
                                currentState = 3;
                                break checkCurrentState;
                            case '!':
                                pos++;
                                if (pos >= end) {
                                    if (!endWithEof) {
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                        }
                                        stack.push(0); // push root
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === '[') {
                                    pos++;
                                    pos2 = pos;
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                    }
                                    tokens.push({ type: TokenType.MarkupArrayStart, isMissing: false, endPos: pos2 });
                                    stack.push(0); // push root
                                    currentState = 4;
                                    break checkCurrentState;
                                }
                                break;
                        }
                    result = readRequiredIdentifier(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof) {
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        stack.push(0); // push root
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful) {
                        pos = result.newPos;
                        pos1 = pos;
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        tokens.push({ type: TokenType.Primitive, isMissing: false, endPos: pos1 });
                        currentState = 0;
                        break checkCurrentState;
                    }
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                            }
                            stack.push(0); // push root
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else {
                        pos++;
                        pos1 = pos;
                        lastWasAmbientToken = true;
                        currentState = 0;
                        break checkCurrentState;
                    }
                    stack.push(0); // push root
                    return pos0 - offset; // tokenized count
                case 1:
                    pos0 = pos;
                    result = readWhitespace(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof) {
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        stack.push(1); // push inObject
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful) {
                        pos = result.newPos;
                        pos1 = pos;
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        tokens.push({ type: TokenType.Whitespace, isMissing: false, endPos: pos1 });
                        currentState = 1;
                        break checkCurrentState;
                    }
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                            }
                            stack.push(1); // push inObject
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else
                        switch (buffer[pos]) {
                            case '/':
                                pos++;
                                pos1 = pos;
                                result = readRequiredIdentifier(buffer, end, pos);
                                if (result.needMoreLookahead && !endWithEof) {
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                    }
                                    stack.push(1); // push inObject
                                    return pos0 - offset; // tokenized count
                                }
                                if (result.successful) {
                                    pos = result.newPos;
                                    pos2 = pos;
                                    if (pos >= end) {
                                        if (!endWithEof) {
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                            }
                                            stack.push(1); // push inObject
                                            return pos0 - offset; // tokenized count
                                        }
                                    }
                                    else if (buffer[pos] === ':') {
                                        pos++;
                                        pos3 = pos;
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                        }
                                        tokens.push({ type: TokenType.AttributePrefix, isMissing: true, endPos: pos0 });
                                        tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos1 });
                                        tokens.push({ type: TokenType.AttributeName, isMissing: false, endPos: pos2 });
                                        tokens.push({ type: TokenType.AttributeColon, isMissing: false, endPos: pos3 });
                                        currentState = 1;
                                        break checkCurrentState;
                                    }
                                    pos = pos2;
                                }
                                if (pos >= end) {
                                    if (!endWithEof) {
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                        }
                                        stack.push(1); // push inObject
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === ':') {
                                    pos++;
                                    pos2 = pos;
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                    }
                                    tokens.push({ type: TokenType.AttributePrefix, isMissing: true, endPos: pos0 });
                                    tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.AttributeName, isMissing: true, endPos: pos1 });
                                    tokens.push({ type: TokenType.AttributeColon, isMissing: false, endPos: pos2 });
                                    currentState = 1;
                                    break checkCurrentState;
                                }
                                pos = pos1;
                                break;
                            case ':':
                                pos++;
                                pos1 = pos;
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                }
                                tokens.push({ type: TokenType.AttributePrefix, isMissing: false, endPos: pos0 });
                                tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos0 });
                                tokens.push({ type: TokenType.AttributeName, isMissing: true, endPos: pos0 });
                                tokens.push({ type: TokenType.AttributeColon, isMissing: false, endPos: pos1 });
                                currentState = 1;
                                break checkCurrentState;
                            case '<':
                                pos++;
                                pos1 = pos;
                                result = readOptionalIdentifier(buffer, end, pos);
                                if (result.needMoreLookahead && !endWithEof) {
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                    }
                                    stack.push(1); // push inObject
                                    return pos0 - offset; // tokenized count
                                }
                                if (result.successful) {
                                    pos = result.newPos;
                                    pos2 = pos;
                                    if (pos >= end) {
                                        if (!endWithEof) {
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                            }
                                            stack.push(1); // push inObject
                                            return pos0 - offset; // tokenized count
                                        }
                                    }
                                    else if (buffer[pos] === '<') {
                                        pos++;
                                        pos3 = pos;
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                        }
                                        tokens.push({ type: TokenType.HeredocStringStart1, isMissing: false, endPos: pos1 });
                                        tokens.push({ type: TokenType.HeredocStringDelimiter, isMissing: false, endPos: pos2 });
                                        tokens.push({ type: TokenType.HeredocStringStart2, isMissing: false, endPos: pos3 });
                                        state.identifier = buffer.substring(pos1, pos2);
                                        stack.push(1); // push inObject
                                        currentState = 5;
                                        break checkCurrentState;
                                    }
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                    }
                                    tokens.push({ type: TokenType.StringStart, isMissing: false, endPos: pos1 });
                                    lastWasAmbientToken = true;
                                    stack.push(1); // push inObject
                                    currentState = 6;
                                    break checkCurrentState;
                                }
                                pos = pos1;
                                break;
                            case '{':
                                pos++;
                                pos1 = pos;
                                if (pos >= end) {
                                    if (!endWithEof) {
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                        }
                                        stack.push(1); // push inObject
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else
                                    switch (buffer[pos]) {
                                        case '-':
                                            pos++;
                                            pos2 = pos;
                                            result = readOptionalIdentifier(buffer, end, pos);
                                            if (result.needMoreLookahead && !endWithEof) {
                                                if (lastWasAmbientToken) {
                                                    lastWasAmbientToken = false;
                                                    tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                                }
                                                stack.push(1); // push inObject
                                                return pos0 - offset; // tokenized count
                                            }
                                            if (result.successful) {
                                                pos = result.newPos;
                                                pos3 = pos;
                                                if (pos >= end) {
                                                    if (!endWithEof) {
                                                        if (lastWasAmbientToken) {
                                                            lastWasAmbientToken = false;
                                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                                        }
                                                        stack.push(1); // push inObject
                                                        return pos0 - offset; // tokenized count
                                                    }
                                                }
                                                else if (buffer[pos] === '-') {
                                                    pos++;
                                                    pos4 = pos;
                                                    if (lastWasAmbientToken) {
                                                        lastWasAmbientToken = false;
                                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                                    }
                                                    tokens.push({ type: TokenType.CommentStart1, isMissing: false, endPos: pos2 });
                                                    tokens.push({ type: TokenType.CommentDelimiter, isMissing: false, endPos: pos3 });
                                                    tokens.push({ type: TokenType.CommentStart2, isMissing: false, endPos: pos4 });
                                                    state.identifier = buffer.substring(pos2, pos3);
                                                    stack.push(1); // push inObject
                                                    currentState = 7;
                                                    break checkCurrentState;
                                                }
                                                pos = pos3;
                                            }
                                            pos = pos2;
                                            break;
                                        case '=':
                                            pos++;
                                            pos2 = pos;
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                            }
                                            tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                            tokens.push({ type: TokenType.ObjectCast, isMissing: false, endPos: pos2 });
                                            stack.push(1); // push inObject
                                            currentState = 2;
                                            break checkCurrentState;
                                        case '$':
                                            pos++;
                                            pos2 = pos;
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                            }
                                            tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                            tokens.push({ type: TokenType.ObjectInference, isMissing: false, endPos: pos2 });
                                            stack.push(1); // push inObject
                                            currentState = 1;
                                            break checkCurrentState;
                                    }
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                }
                                tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                stack.push(1); // push inObject
                                currentState = 2;
                                break checkCurrentState;
                            case '[':
                                pos++;
                                pos1 = pos;
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                }
                                tokens.push({ type: TokenType.ArrayStart, isMissing: false, endPos: pos1 });
                                stack.push(1); // push inObject
                                currentState = 3;
                                break checkCurrentState;
                            case '!':
                                pos++;
                                if (pos >= end) {
                                    if (!endWithEof) {
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                        }
                                        stack.push(1); // push inObject
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === '[') {
                                    pos++;
                                    pos2 = pos;
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                    }
                                    tokens.push({ type: TokenType.MarkupArrayStart, isMissing: false, endPos: pos2 });
                                    stack.push(1); // push inObject
                                    currentState = 4;
                                    break checkCurrentState;
                                }
                                break;
                            case '}':
                                pos++;
                                pos1 = pos;
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                }
                                tokens.push({ type: TokenType.ObjectEnd, isMissing: false, endPos: pos1 });
                                currentState = stack.pop();
                                break checkCurrentState;
                        }
                    result = readRequiredIdentifier(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof) {
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        stack.push(1); // push inObject
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful) {
                        pos = result.newPos;
                        pos1 = pos;
                        if (pos >= end) {
                            if (!endWithEof) {
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                }
                                stack.push(1); // push inObject
                                return pos0 - offset; // tokenized count
                            }
                        }
                        else
                            switch (buffer[pos]) {
                                case '/':
                                    pos++;
                                    pos2 = pos;
                                    result = readRequiredIdentifier(buffer, end, pos);
                                    if (result.needMoreLookahead && !endWithEof) {
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                        }
                                        stack.push(1); // push inObject
                                        return pos0 - offset; // tokenized count
                                    }
                                    if (result.successful) {
                                        pos = result.newPos;
                                        pos3 = pos;
                                        if (pos >= end) {
                                            if (!endWithEof) {
                                                if (lastWasAmbientToken) {
                                                    lastWasAmbientToken = false;
                                                    tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                                }
                                                stack.push(1); // push inObject
                                                return pos0 - offset; // tokenized count
                                            }
                                        }
                                        else if (buffer[pos] === ':') {
                                            pos++;
                                            pos4 = pos;
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                            }
                                            tokens.push({ type: TokenType.AttributePrefix, isMissing: false, endPos: pos1 });
                                            tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos2 });
                                            tokens.push({ type: TokenType.AttributeName, isMissing: false, endPos: pos3 });
                                            tokens.push({ type: TokenType.AttributeColon, isMissing: false, endPos: pos4 });
                                            currentState = 1;
                                            break checkCurrentState;
                                        }
                                        pos = pos3;
                                    }
                                    if (pos >= end) {
                                        if (!endWithEof) {
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                            }
                                            stack.push(1); // push inObject
                                            return pos0 - offset; // tokenized count
                                        }
                                    }
                                    else if (buffer[pos] === ':') {
                                        pos++;
                                        pos3 = pos;
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                        }
                                        tokens.push({ type: TokenType.AttributePrefix, isMissing: false, endPos: pos1 });
                                        tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos2 });
                                        tokens.push({ type: TokenType.AttributeName, isMissing: true, endPos: pos2 });
                                        tokens.push({ type: TokenType.AttributeColon, isMissing: false, endPos: pos3 });
                                        currentState = 1;
                                        break checkCurrentState;
                                    }
                                    pos = pos2;
                                    break;
                                case ':':
                                    pos++;
                                    pos2 = pos;
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                    }
                                    tokens.push({ type: TokenType.AttributePrefix, isMissing: false, endPos: pos0 });
                                    tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos0 });
                                    tokens.push({ type: TokenType.AttributeName, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.AttributeColon, isMissing: false, endPos: pos2 });
                                    currentState = 1;
                                    break checkCurrentState;
                            }
                        result = readPrimitive(buffer, end, pos);
                        if (result.needMoreLookahead && !endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                            }
                            stack.push(1); // push inObject
                            return pos0 - offset; // tokenized count
                        }
                        if (result.successful) {
                            pos = result.newPos;
                            pos2 = pos;
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                            }
                            tokens.push({ type: TokenType.Primitive, isMissing: false, endPos: pos2 });
                            currentState = 1;
                            break checkCurrentState;
                        }
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        tokens.push({ type: TokenType.Primitive, isMissing: false, endPos: pos1 });
                        currentState = 1;
                        break checkCurrentState;
                    }
                    result = readPrimitive(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof) {
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        stack.push(1); // push inObject
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful) {
                        pos = result.newPos;
                        pos1 = pos;
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        tokens.push({ type: TokenType.Primitive, isMissing: false, endPos: pos1 });
                        currentState = 1;
                        break checkCurrentState;
                    }
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                            }
                            stack.push(1); // push inObject
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else {
                        pos++;
                        pos1 = pos;
                        lastWasAmbientToken = true;
                        currentState = 1;
                        break checkCurrentState;
                    }
                    if (endWithEof && pos === end) {
                        pos1 = pos;
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        tokens.push({ type: TokenType.ObjectEnd, isMissing: true, endPos: pos1 });
                        currentState = stack.pop();
                        break checkCurrentState;
                    }
                    pos = pos0;
                    throw new Error();
                case 2:
                    pos0 = pos;
                    if (pos >= end) {
                        if (!endWithEof) {
                            stack.push(2); // push inObjectStart
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else if (buffer[pos] === '/') {
                        pos++;
                        pos1 = pos;
                        result = readRequiredIdentifier(buffer, end, pos);
                        if (result.needMoreLookahead && !endWithEof) {
                            stack.push(2); // push inObjectStart
                            return pos0 - offset; // tokenized count
                        }
                        if (result.successful) {
                            pos = result.newPos;
                            pos2 = pos;
                            tokens.push({ type: TokenType.TypePrefix, isMissing: true, endPos: pos0 });
                            tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos1 });
                            tokens.push({ type: TokenType.TypeName, isMissing: false, endPos: pos2 });
                            currentState = 1;
                            break checkCurrentState;
                        }
                        tokens.push({ type: TokenType.TypePrefix, isMissing: true, endPos: pos0 });
                        tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos1 });
                        tokens.push({ type: TokenType.TypeName, isMissing: true, endPos: pos1 });
                        currentState = 1;
                        break checkCurrentState;
                    }
                    result = readRequiredIdentifier(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof) {
                        stack.push(2); // push inObjectStart
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful) {
                        pos = result.newPos;
                        pos1 = pos;
                        if (pos >= end) {
                            if (!endWithEof) {
                                stack.push(2); // push inObjectStart
                                return pos0 - offset; // tokenized count
                            }
                        }
                        else if (buffer[pos] === '/') {
                            pos++;
                            pos2 = pos;
                            result = readRequiredIdentifier(buffer, end, pos);
                            if (result.needMoreLookahead && !endWithEof) {
                                stack.push(2); // push inObjectStart
                                return pos0 - offset; // tokenized count
                            }
                            if (result.successful) {
                                pos = result.newPos;
                                pos3 = pos;
                                tokens.push({ type: TokenType.TypePrefix, isMissing: false, endPos: pos1 });
                                tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos2 });
                                tokens.push({ type: TokenType.TypeName, isMissing: false, endPos: pos3 });
                                currentState = 1;
                                break checkCurrentState;
                            }
                            pos = pos2;
                        }
                        tokens.push({ type: TokenType.TypePrefix, isMissing: false, endPos: pos0 });
                        tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos0 });
                        tokens.push({ type: TokenType.TypeName, isMissing: false, endPos: pos1 });
                        currentState = 1;
                        break checkCurrentState;
                    }
                    tokens.push({ type: TokenType.TypePrefix, isMissing: false, endPos: pos0 });
                    tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos0 });
                    tokens.push({ type: TokenType.TypeName, isMissing: true, endPos: pos0 });
                    currentState = 1;
                    break checkCurrentState;
                case 3:
                    pos0 = pos;
                    result = readWhitespace(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof) {
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        stack.push(3); // push inArray
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful) {
                        pos = result.newPos;
                        pos1 = pos;
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        tokens.push({ type: TokenType.Whitespace, isMissing: false, endPos: pos1 });
                        currentState = 3;
                        break checkCurrentState;
                    }
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                            }
                            stack.push(3); // push inArray
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else
                        switch (buffer[pos]) {
                            case '<':
                                pos++;
                                pos1 = pos;
                                result = readOptionalIdentifier(buffer, end, pos);
                                if (result.needMoreLookahead && !endWithEof) {
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                    }
                                    stack.push(3); // push inArray
                                    return pos0 - offset; // tokenized count
                                }
                                if (result.successful) {
                                    pos = result.newPos;
                                    pos2 = pos;
                                    if (pos >= end) {
                                        if (!endWithEof) {
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                            }
                                            stack.push(3); // push inArray
                                            return pos0 - offset; // tokenized count
                                        }
                                    }
                                    else if (buffer[pos] === '<') {
                                        pos++;
                                        pos3 = pos;
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                        }
                                        tokens.push({ type: TokenType.HeredocStringStart1, isMissing: false, endPos: pos1 });
                                        tokens.push({ type: TokenType.HeredocStringDelimiter, isMissing: false, endPos: pos2 });
                                        tokens.push({ type: TokenType.HeredocStringStart2, isMissing: false, endPos: pos3 });
                                        state.identifier = buffer.substring(pos1, pos2);
                                        stack.push(3); // push inArray
                                        currentState = 5;
                                        break checkCurrentState;
                                    }
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                    }
                                    tokens.push({ type: TokenType.StringStart, isMissing: false, endPos: pos1 });
                                    lastWasAmbientToken = true;
                                    stack.push(3); // push inArray
                                    currentState = 6;
                                    break checkCurrentState;
                                }
                                pos = pos1;
                                break;
                            case '{':
                                pos++;
                                pos1 = pos;
                                if (pos >= end) {
                                    if (!endWithEof) {
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                        }
                                        stack.push(3); // push inArray
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else
                                    switch (buffer[pos]) {
                                        case '-':
                                            pos++;
                                            pos2 = pos;
                                            result = readOptionalIdentifier(buffer, end, pos);
                                            if (result.needMoreLookahead && !endWithEof) {
                                                if (lastWasAmbientToken) {
                                                    lastWasAmbientToken = false;
                                                    tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                                }
                                                stack.push(3); // push inArray
                                                return pos0 - offset; // tokenized count
                                            }
                                            if (result.successful) {
                                                pos = result.newPos;
                                                pos3 = pos;
                                                if (pos >= end) {
                                                    if (!endWithEof) {
                                                        if (lastWasAmbientToken) {
                                                            lastWasAmbientToken = false;
                                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                                        }
                                                        stack.push(3); // push inArray
                                                        return pos0 - offset; // tokenized count
                                                    }
                                                }
                                                else if (buffer[pos] === '-') {
                                                    pos++;
                                                    pos4 = pos;
                                                    if (lastWasAmbientToken) {
                                                        lastWasAmbientToken = false;
                                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                                    }
                                                    tokens.push({ type: TokenType.CommentStart1, isMissing: false, endPos: pos2 });
                                                    tokens.push({ type: TokenType.CommentDelimiter, isMissing: false, endPos: pos3 });
                                                    tokens.push({ type: TokenType.CommentStart2, isMissing: false, endPos: pos4 });
                                                    state.identifier = buffer.substring(pos2, pos3);
                                                    stack.push(3); // push inArray
                                                    currentState = 7;
                                                    break checkCurrentState;
                                                }
                                                pos = pos3;
                                            }
                                            pos = pos2;
                                            break;
                                        case '=':
                                            pos++;
                                            pos2 = pos;
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                            }
                                            tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                            tokens.push({ type: TokenType.ObjectCast, isMissing: false, endPos: pos2 });
                                            stack.push(3); // push inArray
                                            currentState = 2;
                                            break checkCurrentState;
                                        case '$':
                                            pos++;
                                            pos2 = pos;
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                            }
                                            tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                            tokens.push({ type: TokenType.ObjectInference, isMissing: false, endPos: pos2 });
                                            stack.push(3); // push inArray
                                            currentState = 1;
                                            break checkCurrentState;
                                    }
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                }
                                tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                stack.push(3); // push inArray
                                currentState = 2;
                                break checkCurrentState;
                            case '[':
                                pos++;
                                pos1 = pos;
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                }
                                tokens.push({ type: TokenType.ArrayStart, isMissing: false, endPos: pos1 });
                                stack.push(3); // push inArray
                                currentState = 3;
                                break checkCurrentState;
                            case '!':
                                pos++;
                                if (pos >= end) {
                                    if (!endWithEof) {
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                        }
                                        stack.push(3); // push inArray
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === '[') {
                                    pos++;
                                    pos2 = pos;
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                    }
                                    tokens.push({ type: TokenType.MarkupArrayStart, isMissing: false, endPos: pos2 });
                                    stack.push(3); // push inArray
                                    currentState = 4;
                                    break checkCurrentState;
                                }
                                break;
                            case ']':
                                pos++;
                                pos1 = pos;
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                                }
                                tokens.push({ type: TokenType.ArrayEnd, isMissing: false, endPos: pos1 });
                                currentState = stack.pop();
                                break checkCurrentState;
                        }
                    result = readRequiredIdentifier(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof) {
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        stack.push(3); // push inArray
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful) {
                        pos = result.newPos;
                        pos1 = pos;
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        tokens.push({ type: TokenType.Primitive, isMissing: false, endPos: pos1 });
                        currentState = 3;
                        break checkCurrentState;
                    }
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                            }
                            stack.push(3); // push inArray
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else {
                        pos++;
                        pos1 = pos;
                        lastWasAmbientToken = true;
                        currentState = 3;
                        break checkCurrentState;
                    }
                    if (endWithEof && pos === end) {
                        pos1 = pos;
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 });
                        }
                        tokens.push({ type: TokenType.ArrayEnd, isMissing: true, endPos: pos1 });
                        currentState = stack.pop();
                        break checkCurrentState;
                    }
                    pos = pos0;
                    throw new Error();
                case 4:
                    pos0 = pos;
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                            }
                            stack.push(4); // push inMarkupArray
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else
                        switch (buffer[pos]) {
                            case '<':
                                pos++;
                                pos1 = pos;
                                result = readOptionalIdentifier(buffer, end, pos);
                                if (result.needMoreLookahead && !endWithEof) {
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                    }
                                    stack.push(4); // push inMarkupArray
                                    return pos0 - offset; // tokenized count
                                }
                                if (result.successful) {
                                    pos = result.newPos;
                                    pos2 = pos;
                                    if (pos >= end) {
                                        if (!endWithEof) {
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                            }
                                            stack.push(4); // push inMarkupArray
                                            return pos0 - offset; // tokenized count
                                        }
                                    }
                                    else if (buffer[pos] === '<') {
                                        pos++;
                                        pos3 = pos;
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                        }
                                        tokens.push({ type: TokenType.HeredocStringStart1, isMissing: false, endPos: pos1 });
                                        tokens.push({ type: TokenType.HeredocStringDelimiter, isMissing: false, endPos: pos2 });
                                        tokens.push({ type: TokenType.HeredocStringStart2, isMissing: false, endPos: pos3 });
                                        state.identifier = buffer.substring(pos1, pos2);
                                        stack.push(4); // push inMarkupArray
                                        currentState = 5;
                                        break checkCurrentState;
                                    }
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                    }
                                    tokens.push({ type: TokenType.StringStart, isMissing: false, endPos: pos1 });
                                    lastWasAmbientToken = true;
                                    stack.push(4); // push inMarkupArray
                                    currentState = 6;
                                    break checkCurrentState;
                                }
                                pos = pos1;
                                break;
                            case '{':
                                pos++;
                                pos1 = pos;
                                if (pos >= end) {
                                    if (!endWithEof) {
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                        }
                                        stack.push(4); // push inMarkupArray
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else
                                    switch (buffer[pos]) {
                                        case '-':
                                            pos++;
                                            pos2 = pos;
                                            result = readOptionalIdentifier(buffer, end, pos);
                                            if (result.needMoreLookahead && !endWithEof) {
                                                if (lastWasAmbientToken) {
                                                    lastWasAmbientToken = false;
                                                    tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                                }
                                                stack.push(4); // push inMarkupArray
                                                return pos0 - offset; // tokenized count
                                            }
                                            if (result.successful) {
                                                pos = result.newPos;
                                                pos3 = pos;
                                                if (pos >= end) {
                                                    if (!endWithEof) {
                                                        if (lastWasAmbientToken) {
                                                            lastWasAmbientToken = false;
                                                            tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                                        }
                                                        stack.push(4); // push inMarkupArray
                                                        return pos0 - offset; // tokenized count
                                                    }
                                                }
                                                else if (buffer[pos] === '-') {
                                                    pos++;
                                                    pos4 = pos;
                                                    if (lastWasAmbientToken) {
                                                        lastWasAmbientToken = false;
                                                        tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                                    }
                                                    tokens.push({ type: TokenType.CommentStart1, isMissing: false, endPos: pos2 });
                                                    tokens.push({ type: TokenType.CommentDelimiter, isMissing: false, endPos: pos3 });
                                                    tokens.push({ type: TokenType.CommentStart2, isMissing: false, endPos: pos4 });
                                                    state.identifier = buffer.substring(pos2, pos3);
                                                    stack.push(4); // push inMarkupArray
                                                    currentState = 7;
                                                    break checkCurrentState;
                                                }
                                                pos = pos3;
                                            }
                                            pos = pos2;
                                            break;
                                        case '=':
                                            pos++;
                                            pos2 = pos;
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                            }
                                            tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                            tokens.push({ type: TokenType.ObjectCast, isMissing: false, endPos: pos2 });
                                            stack.push(4); // push inMarkupArray
                                            currentState = 2;
                                            break checkCurrentState;
                                        case '$':
                                            pos++;
                                            pos2 = pos;
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                            }
                                            tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                            tokens.push({ type: TokenType.ObjectInference, isMissing: false, endPos: pos2 });
                                            stack.push(4); // push inMarkupArray
                                            currentState = 1;
                                            break checkCurrentState;
                                    }
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                }
                                tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                stack.push(4); // push inMarkupArray
                                currentState = 2;
                                break checkCurrentState;
                            case '[':
                                pos++;
                                pos1 = pos;
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                }
                                tokens.push({ type: TokenType.ArrayStart, isMissing: false, endPos: pos1 });
                                stack.push(4); // push inMarkupArray
                                currentState = 3;
                                break checkCurrentState;
                            case '!':
                                pos++;
                                if (pos >= end) {
                                    if (!endWithEof) {
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                        }
                                        stack.push(4); // push inMarkupArray
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === '[') {
                                    pos++;
                                    pos2 = pos;
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                    }
                                    tokens.push({ type: TokenType.MarkupArrayStart, isMissing: false, endPos: pos2 });
                                    stack.push(4); // push inMarkupArray
                                    currentState = 4;
                                    break checkCurrentState;
                                }
                                break;
                            case ']':
                                pos++;
                                pos1 = pos;
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                                }
                                tokens.push({ type: TokenType.MarkupArrayEnd, isMissing: false, endPos: pos1 });
                                currentState = stack.pop();
                                break checkCurrentState;
                        }
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                            }
                            stack.push(4); // push inMarkupArray
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else {
                        pos++;
                        pos1 = pos;
                        lastWasAmbientToken = true;
                        currentState = 4;
                        break checkCurrentState;
                    }
                    if (endWithEof && pos === end) {
                        pos1 = pos;
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 });
                        }
                        tokens.push({ type: TokenType.MarkupArrayEnd, isMissing: true, endPos: pos1 });
                        currentState = stack.pop();
                        break checkCurrentState;
                    }
                    pos = pos0;
                    throw new Error();
                case 5:
                    pos0 = pos;
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 });
                            }
                            stack.push(5); // push inHeredocString
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else
                        switch (buffer[pos]) {
                            case '>':
                                pos++;
                                pos1 = pos;
                                result = readMatchIdentifier(buffer, end, pos, state.identifier);
                                if (result.needMoreLookahead && !endWithEof) {
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 });
                                    }
                                    stack.push(5); // push inHeredocString
                                    return pos0 - offset; // tokenized count
                                }
                                if (result.successful) {
                                    pos = result.newPos;
                                    pos2 = pos;
                                    if (pos >= end) {
                                        if (!endWithEof) {
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 });
                                            }
                                            stack.push(5); // push inHeredocString
                                            return pos0 - offset; // tokenized count
                                        }
                                    }
                                    else if (buffer[pos] === '>') {
                                        pos++;
                                        pos3 = pos;
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 });
                                        }
                                        tokens.push({ type: TokenType.HeredocStringEnd1, isMissing: false, endPos: pos1 });
                                        tokens.push({ type: TokenType.HeredocStringDelimiter, isMissing: false, endPos: pos2 });
                                        tokens.push({ type: TokenType.HeredocStringEnd2, isMissing: false, endPos: pos3 });
                                        state.identifier = undefined;
                                        currentState = stack.pop();
                                        break checkCurrentState;
                                    }
                                    lastWasAmbientToken = true;
                                    currentState = 5;
                                    break checkCurrentState;
                                }
                                lastWasAmbientToken = true;
                                currentState = 5;
                                break checkCurrentState;
                            case '\\':
                                pos++;
                                pos1 = pos;
                                result = readMatchIdentifier(buffer, end, pos, state.identifier);
                                if (result.needMoreLookahead && !endWithEof) {
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 });
                                    }
                                    stack.push(5); // push inHeredocString
                                    return pos0 - offset; // tokenized count
                                }
                                if (result.successful) {
                                    pos = result.newPos;
                                    pos2 = pos;
                                    if (pos >= end) {
                                        if (!endWithEof) {
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 });
                                            }
                                            stack.push(5); // push inHeredocString
                                            return pos0 - offset; // tokenized count
                                        }
                                    }
                                    else if (buffer[pos] === '\\') {
                                        pos++;
                                        pos3 = pos;
                                        result = readEscape(buffer, end, pos);
                                        if (result.needMoreLookahead && !endWithEof) {
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 });
                                            }
                                            stack.push(5); // push inHeredocString
                                            return pos0 - offset; // tokenized count
                                        }
                                        if (result.successful) {
                                            pos = result.newPos;
                                            pos4 = pos;
                                            if (lastWasAmbientToken) {
                                                lastWasAmbientToken = false;
                                                tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 });
                                            }
                                            tokens.push({ type: TokenType.HeredocStringEscapeSeq, isMissing: false, endPos: pos1 });
                                            tokens.push({ type: TokenType.HeredocStringDelimiter, isMissing: false, endPos: pos2 });
                                            tokens.push({ type: TokenType.EscapeSeqStart, isMissing: false, endPos: pos3 });
                                            tokens.push({ type: TokenType.EscapeSeq, isMissing: false, endPos: pos4 });
                                            currentState = 5;
                                            break checkCurrentState;
                                        }
                                        pos = pos3;
                                    }
                                    lastWasAmbientToken = true;
                                    currentState = 5;
                                    break checkCurrentState;
                                }
                                lastWasAmbientToken = true;
                                currentState = 5;
                                break checkCurrentState;
                        }
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 });
                            }
                            stack.push(5); // push inHeredocString
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else {
                        pos++;
                        pos1 = pos;
                        lastWasAmbientToken = true;
                        currentState = 5;
                        break checkCurrentState;
                    }
                    if (endWithEof && pos === end) {
                        pos1 = pos;
                        if (endWithEof && pos === end) {
                            pos2 = pos;
                            if (endWithEof && pos === end) {
                                pos3 = pos;
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 });
                                }
                                tokens.push({ type: TokenType.HeredocStringEnd1, isMissing: true, endPos: pos1 });
                                tokens.push({ type: TokenType.HeredocStringDelimiter, isMissing: true, endPos: pos2 });
                                tokens.push({ type: TokenType.HeredocStringEnd2, isMissing: true, endPos: pos3 });
                                state.identifier = undefined;
                                currentState = stack.pop();
                                break checkCurrentState;
                            }
                            pos = pos2;
                        }
                        pos = pos1;
                    }
                    pos = pos0;
                    throw new Error();
                case 6:
                    pos0 = pos;
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 });
                            }
                            stack.push(6); // push inString
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else if (buffer[pos] === '\\') {
                        pos++;
                        pos1 = pos;
                        result = readEscape(buffer, end, pos);
                        if (result.needMoreLookahead && !endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 });
                            }
                            stack.push(6); // push inString
                            return pos0 - offset; // tokenized count
                        }
                        if (result.successful) {
                            pos = result.newPos;
                            pos2 = pos;
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 });
                            }
                            tokens.push({ type: TokenType.EscapeSeqStart, isMissing: false, endPos: pos1 });
                            tokens.push({ type: TokenType.EscapeSeq, isMissing: false, endPos: pos2 });
                            currentState = 6;
                            break checkCurrentState;
                        }
                        pos = pos1;
                    }
                    result = readLineBreak(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof) {
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 });
                        }
                        stack.push(6); // push inString
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful) {
                        pos = result.newPos;
                        pos1 = pos;
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 });
                        }
                        tokens.push({ type: TokenType.StringEnd, isMissing: true, endPos: pos0 });
                        tokens.push({ type: TokenType.Whitespace, isMissing: false, endPos: pos1 });
                        currentState = stack.pop();
                        break checkCurrentState;
                    }
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 });
                            }
                            stack.push(6); // push inString
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else if (buffer[pos] === '>') {
                        pos++;
                        pos1 = pos;
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 });
                        }
                        tokens.push({ type: TokenType.StringEnd, isMissing: false, endPos: pos1 });
                        currentState = stack.pop();
                        break checkCurrentState;
                    }
                    if (endWithEof && pos === end) {
                        pos1 = pos;
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 });
                        }
                        tokens.push({ type: TokenType.StringEnd, isMissing: true, endPos: pos1 });
                        currentState = stack.pop();
                        break checkCurrentState;
                    }
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 });
                            }
                            stack.push(6); // push inString
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else if (buffer[pos] === '<') {
                        pos++;
                        pos1 = pos;
                        if (lastWasAmbientToken) {
                            lastWasAmbientToken = false;
                            tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 });
                        }
                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos1 });
                        currentState = 6;
                        break checkCurrentState;
                    }
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 });
                            }
                            stack.push(6); // push inString
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else {
                        pos++;
                        pos1 = pos;
                        lastWasAmbientToken = true;
                        currentState = 6;
                        break checkCurrentState;
                    }
                    pos = pos0;
                    throw new Error();
                case 7:
                    pos0 = pos;
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.Comment, isMissing: false, endPos: pos0 });
                            }
                            stack.push(7); // push inComment
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else if (buffer[pos] === '-') {
                        pos++;
                        pos1 = pos;
                        result = readMatchIdentifier(buffer, end, pos, state.identifier);
                        if (result.needMoreLookahead && !endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.Comment, isMissing: false, endPos: pos0 });
                            }
                            stack.push(7); // push inComment
                            return pos0 - offset; // tokenized count
                        }
                        if (result.successful) {
                            pos = result.newPos;
                            pos2 = pos;
                            if (pos >= end) {
                                if (!endWithEof) {
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.Comment, isMissing: false, endPos: pos0 });
                                    }
                                    stack.push(7); // push inComment
                                    return pos0 - offset; // tokenized count
                                }
                            }
                            else if (buffer[pos] === '-') {
                                pos++;
                                if (pos >= end) {
                                    if (!endWithEof) {
                                        if (lastWasAmbientToken) {
                                            lastWasAmbientToken = false;
                                            tokens.push({ type: TokenType.Comment, isMissing: false, endPos: pos0 });
                                        }
                                        stack.push(7); // push inComment
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === '}') {
                                    pos++;
                                    pos4 = pos;
                                    if (lastWasAmbientToken) {
                                        lastWasAmbientToken = false;
                                        tokens.push({ type: TokenType.Comment, isMissing: false, endPos: pos0 });
                                    }
                                    tokens.push({ type: TokenType.CommentEnd1, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.CommentDelimiter, isMissing: false, endPos: pos2 });
                                    tokens.push({ type: TokenType.CommentEnd2, isMissing: false, endPos: pos4 });
                                    state.identifier = undefined;
                                    currentState = stack.pop();
                                    break checkCurrentState;
                                }
                            }
                            pos = pos2;
                        }
                        pos = pos1;
                    }
                    if (endWithEof && pos === end) {
                        pos1 = pos;
                        if (endWithEof && pos === end) {
                            pos2 = pos;
                            if (endWithEof && pos === end) {
                                pos3 = pos;
                                if (lastWasAmbientToken) {
                                    lastWasAmbientToken = false;
                                    tokens.push({ type: TokenType.Comment, isMissing: false, endPos: pos0 });
                                }
                                tokens.push({ type: TokenType.CommentEnd1, isMissing: true, endPos: pos1 });
                                tokens.push({ type: TokenType.CommentDelimiter, isMissing: true, endPos: pos2 });
                                tokens.push({ type: TokenType.CommentEnd2, isMissing: true, endPos: pos3 });
                                state.identifier = undefined;
                                currentState = stack.pop();
                                break checkCurrentState;
                            }
                            pos = pos2;
                        }
                        pos = pos1;
                    }
                    if (pos >= end) {
                        if (!endWithEof) {
                            if (lastWasAmbientToken) {
                                lastWasAmbientToken = false;
                                tokens.push({ type: TokenType.Comment, isMissing: false, endPos: pos0 });
                            }
                            stack.push(7); // push inComment
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else {
                        pos++;
                        pos1 = pos;
                        lastWasAmbientToken = true;
                        currentState = 7;
                        break checkCurrentState;
                    }
                    pos = pos0;
                    throw new Error();
            }
        }
    };
    return Tokenizer;
}());
function tokenize2(line, s, eof) {
    var text = line.innerText;
    var tokens = [];
    Tokenizer.Tokenize(s, text, 0, text.length, eof, tokens);
    var newHtml = "";
    var lastPos = 0;
    for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
        var t = tokens_1[_i];
        var tokenText = text.substring(lastPos, t.endPos);
        lastPos = t.endPos;
        newHtml += "<span class=\"token " + TokenType[t.type] + "\">" + tokenText + "</span>";
    }
    line.innerHTML = newHtml;
}
function tokenize() {
    var s = { stack: [], identifier: undefined };
    var arr = document.querySelectorAll(".js-file-line");
    for (var lineIdx = 0; lineIdx < arr.length; lineIdx++) {
        tokenize2(arr[lineIdx], s, lineIdx === arr.length - 1);
    }
}
var lastPathName = '';
function update() {
    var newPathName = location.pathname;
    if (newPathName === lastPathName) {
        return;
    }
    lastPathName = newPathName;
    if (lastPathName.endsWith(".tyml")) {
        tokenize();
    }
    for (var _i = 0, _a = document.querySelectorAll("pre[lang='tyml'] code"); _i < _a.length; _i++) {
        var html = _a[_i];
        tokenize2(html, null, true);
    }
}
var pjaxContainer = document.querySelectorAll('#js-repo-pjax-container')[0];
if (pjaxContainer) {
    // use MutationObserver as we can't inject into History API
    new MutationObserver(update).observe(pjaxContainer, { childList: true });
    // initial "update"
    update();
}
