// ==UserScript==
// @name         Tyml Syntax Highlighter
// @namespace    http://tyml.org/
// @version      0.1
// @description  Provider Syntax Highlighting for Tyml files on Github
// @author       Henning Dieterichs
// @match        https://github.com/*
// @grant          GM_addStyle
// ==/UserScript==


declare var GM_addStyle: any;

GM_addStyle(`
    .token.Invalid {
        color: red;
    }
    .token.HeredocStringDelimiter, .token.HeredocStringStart1, .token.HeredocStringStart2, .token.HeredocStringEnd1, .token.HeredocStringEnd2 {
        color: rgb(87, 87, 87)
    }
    .token.HeredocStringEscapeSeq {
    }
    .token.HeredocString {
        color: rgb(3, 57, 202)
    }
    .token.StringStart {
    }
    .token.StringEnd {
    }
    .token.StringText {
        color: rgb(3, 57, 202)
    }
    .token.ArrayStart {
    }
    .token.ArrayEnd {
    }
    .token.MarkupArrayStart {
    }
    .token.MarkupArrayEnd {
    }
    .token.MarkupString {
        color: rgb(88, 120, 170)
    }
    .token.CommentStart1 {
        color: rgb(8, 203, 0)
    }
    .token.CommentDelimiter {
        color: rgb(8, 203, 0)
    }
    .token.CommentStart2 {
        color: rgb(8, 203, 0)
    }
    .token.CommentEnd1 {
        color: rgb(8, 203, 0)
    }
    .token.CommentEnd2 {
        color: rgb(8, 203, 0)
    }
    .token.Comment {
        color: rgb(8, 203, 0)
    }
    .token.TypePrefix {
        color: rgb(73, 175, 175)
    }
    .token.TypeName {
        color: rgb(43, 145, 175)
    }
    .token.ObjectStart {
    }
    .token.ObjectEnd {
    }
    .token.AttributePrefix {
        color: rgb(253, 151, 31)
    }
    .token.PrefixSeparator {
    }
    .token.AttributeName {
        color: rgb(233, 131, 11)
    }
    .token.AttributeColon {
    }
    .token.EscapeSeqStart {
    }
    .token.EscapeSeq {
    }
    .token.Invalid {
    }
    .token.Primitive {
        color: rgb(214, 49, 217)
    }
`);




interface Token {
	type: TokenType;
	endPos: number;
	isMissing: boolean;
}

interface TokenizerState {
	stack: number[];
	identifier: string;
}

function readWhitespace(buffer: string, end: number, pos: number): { newPos: number, successful: boolean, needMoreLookahead: boolean } {
    var startPos = pos;
    while (pos < end)
    {
        if (buffer[pos] == ' ' || buffer[pos] == '\t' || buffer[pos] == '\n' || buffer[pos] == '\r') {
            pos++;
        }
        else break;
    }

    return { newPos: pos, successful: startPos != pos, needMoreLookahead: false };
}

function readOptionalIdentifier(buffer: string, end: number, pos: number): { newPos: number, successful: boolean, needMoreLookahead: boolean } {
    var start = pos;
    while (pos < end)
    {
        if (('0' <= buffer[pos] && buffer[pos] <= '9') 
			|| ('a' <= buffer[pos] && buffer[pos] <= 'z') 
			|| ('A' <= buffer[pos] && buffer[pos] <= 'Z')  || buffer[pos] == '!') {
            pos++;
        }
        else break;
    }

    return { newPos: pos, successful: true, needMoreLookahead: pos == end };
}

function readRequiredIdentifier(buffer: string, end: number, pos: number): { newPos: number, successful: boolean, needMoreLookahead: boolean } {
    var startPos = pos;
    var result = readOptionalIdentifier(buffer, end, pos);
    return { newPos: result.newPos, successful: result.newPos != startPos, needMoreLookahead: result.needMoreLookahead };
}

function readPrimitive(buffer: string, end: number, pos: number): { newPos: number, successful: boolean, needMoreLookahead: boolean } {
    var start = pos;
    while (pos < end)
    {
        if (('a' <= buffer[pos] && buffer[pos] <= 'z') 
			|| ('A' <= buffer[pos] && buffer[pos] <= 'Z') 
			|| ('0' <= buffer[pos] && buffer[pos] <= '9') 
			|| buffer[pos] == '.'
			|| buffer[pos] == '!') {
            pos++;
        }
        else break;
    }

    return { newPos: pos, successful: start != pos, needMoreLookahead: pos == end };
}

function readMatchIdentifier(buffer: string, end: number, pos: number, identifier: string): { newPos: number, successful: boolean, needMoreLookahead: boolean } {
    var strOffset = 0;
    var startPos = pos;
    while (pos < end)
    {
        if (identifier == null || strOffset >= identifier.length)
            return { successful: true, needMoreLookahead: false, newPos: pos };
    
        if (buffer[pos] != identifier[strOffset])
            return { successful: false, needMoreLookahead: false, newPos: startPos };

        pos++;
        strOffset++;
    }

    return { successful: false, needMoreLookahead: true, newPos: startPos };
}

function readEscape(buffer: string, end: number, pos: number): { newPos: number, successful: boolean, needMoreLookahead: boolean } {

    if (end == pos) return { successful: true, needMoreLookahead: true, newPos: pos };

	return { successful: true, needMoreLookahead: false, newPos: pos + 1 };
}

function readLineBreak(buffer: string, end: number, pos: number): { newPos: number, successful: boolean, needMoreLookahead: boolean } {
	return { successful: false, needMoreLookahead: false, newPos: pos };
}


enum TokenType
{
    Whitespace, 
    HeredocStringStart1, 
    HeredocStringDelimiter, 
    HeredocStringStart2, 
    HeredocStringEnd1, 
    HeredocStringEnd2, 
    HeredocStringEscapeSeq, 
    HeredocString, 
    StringStart, 
    StringEnd, 
    StringText, 
    ArrayStart, 
    ArrayEnd, 
    MarkupArrayStart, 
    MarkupArrayEnd, 
    MarkupString, 
    CommentStart1, 
    CommentDelimiter, 
    CommentStart2, 
    CommentEnd1, 
    CommentEnd2, 
    Comment, 
    TypePrefix, 
    TypeName, 
    ObjectStart, 
    ObjectCast, 
    ObjectInference, 
    ObjectEnd, 
    AttributePrefix, 
    PrefixSeparator, 
    AttributeName, 
    AttributeColon, 
    EscapeSeqStart, 
    EscapeSeq, 
    Invalid, 
    Primitive, 
}


class Tokenizer
{     
    public static Tokenize(state: TokenizerState, buffer: string, offset: number, length: number, endWithEof: boolean, 
        tokens: Token[]): number //tokenizedCount
    {    
        let end = offset + length;
        let lastWasAmbientToken = false;
        let needMoreLookahead = false;

        if (!state || !state.stack) 
        {
            state = { stack: [], identifier: undefined };
        }
        let stack = state.stack;
        let currentState = stack.length > 0 ? stack.pop() : 0;
        let pos = offset;
        let pos0 = pos, pos1 = pos, pos2 = pos, pos3 = pos, pos4 = pos;
        let result: { newPos: number, successful: boolean, needMoreLookahead: boolean };

        while (true) 
        {
            checkCurrentState:
            switch (currentState)
            {

                case 0: // root
                    pos0 = pos;
                    result = readWhitespace(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof)
                    {
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        stack.push(0); // push root
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful)
                    {
                        pos = result.newPos;
                        pos1 = pos;
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        tokens.push({ type: TokenType.Whitespace, isMissing: false, endPos: pos1 });
                        currentState = 0; break checkCurrentState;
                    }
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            stack.push(0); // push root
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else switch(buffer[pos])
                    {
                        case '<':
                            pos++;
                            pos1 = pos;
                            result = readOptionalIdentifier(buffer, end, pos);
                            if (result.needMoreLookahead && !endWithEof)
                            {
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                stack.push(0); // push root
                                return pos0 - offset; // tokenized count
                            }
                            if (result.successful)
                            {
                                pos = result.newPos;
                                pos2 = pos;
                                if (pos >= end)
                                {
                                    if (!endWithEof)
                                    {
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                        stack.push(0); // push root
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === '<')
                                {
                                    pos++;
                                    pos3 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.HeredocStringStart1, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.HeredocStringDelimiter, isMissing: false, endPos: pos2 });
                                    tokens.push({ type: TokenType.HeredocStringStart2, isMissing: false, endPos: pos3 });
                                    state.identifier = buffer.substring(pos1, pos2);
                                    stack.push(0); // push root
                                    currentState = 5; break checkCurrentState;
                                }
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                tokens.push({ type: TokenType.StringStart, isMissing: false, endPos: pos1 });
                                lastWasAmbientToken = true;
                                stack.push(0); // push root
                                currentState = 6; break checkCurrentState;
                            }
                            pos = pos1;
                            break;
                        case '{':
                            pos++;
                            pos1 = pos;
                            if (pos >= end)
                            {
                                if (!endWithEof)
                                {
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    stack.push(0); // push root
                                    return pos0 - offset; // tokenized count
                                }
                            }
                            else switch(buffer[pos])
                            {
                                case '-':
                                    pos++;
                                    pos2 = pos;
                                    result = readOptionalIdentifier(buffer, end, pos);
                                    if (result.needMoreLookahead && !endWithEof)
                                    {
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                        stack.push(0); // push root
                                        return pos0 - offset; // tokenized count
                                    }
                                    if (result.successful)
                                    {
                                        pos = result.newPos;
                                        pos3 = pos;
                                        if (pos >= end)
                                        {
                                            if (!endWithEof)
                                            {
                                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                                stack.push(0); // push root
                                                return pos0 - offset; // tokenized count
                                            }
                                        }
                                        else if (buffer[pos] === '-')
                                        {
                                            pos++;
                                            pos4 = pos;
                                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                            tokens.push({ type: TokenType.CommentStart1, isMissing: false, endPos: pos2 });
                                            tokens.push({ type: TokenType.CommentDelimiter, isMissing: false, endPos: pos3 });
                                            tokens.push({ type: TokenType.CommentStart2, isMissing: false, endPos: pos4 });
                                            state.identifier = buffer.substring(pos2, pos3);
                                            stack.push(0); // push root
                                            currentState = 7; break checkCurrentState;
                                        }
                                        pos = pos3;
                                    }
                                    pos = pos2;
                                    break;
                                case '=':
                                    pos++;
                                    pos2 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.ObjectCast, isMissing: false, endPos: pos2 });
                                    stack.push(0); // push root
                                    currentState = 2; break checkCurrentState;
                                case '$':
                                    pos++;
                                    pos2 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.ObjectInference, isMissing: false, endPos: pos2 });
                                    stack.push(0); // push root
                                    currentState = 1; break checkCurrentState;
                            }
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                            stack.push(0); // push root
                            currentState = 2; break checkCurrentState;
                        case '[':
                            pos++;
                            pos1 = pos;
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            tokens.push({ type: TokenType.ArrayStart, isMissing: false, endPos: pos1 });
                            stack.push(0); // push root
                            currentState = 3; break checkCurrentState;
                        case '!':
                            pos++;
                            if (pos >= end)
                            {
                                if (!endWithEof)
                                {
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    stack.push(0); // push root
                                    return pos0 - offset; // tokenized count
                                }
                            }
                            else if (buffer[pos] === '[')
                            {
                                pos++;
                                pos2 = pos;
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                tokens.push({ type: TokenType.MarkupArrayStart, isMissing: false, endPos: pos2 });
                                stack.push(0); // push root
                                currentState = 4; break checkCurrentState;
                            }
                            break;
                    }
                    result = readRequiredIdentifier(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof)
                    {
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        stack.push(0); // push root
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful)
                    {
                        pos = result.newPos;
                        pos1 = pos;
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        tokens.push({ type: TokenType.Primitive, isMissing: false, endPos: pos1 });
                        currentState = 0; break checkCurrentState;
                    }
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            stack.push(0); // push root
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else // any
                    {
                        pos++;
                        pos1 = pos;
                        lastWasAmbientToken = true;
                        currentState = 0; break checkCurrentState;
                    }
                    stack.push(0); // push root
                    return pos0 - offset; // tokenized count
                case 1: // inObject
                    pos0 = pos;
                    result = readWhitespace(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof)
                    {
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        stack.push(1); // push inObject
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful)
                    {
                        pos = result.newPos;
                        pos1 = pos;
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        tokens.push({ type: TokenType.Whitespace, isMissing: false, endPos: pos1 });
                        currentState = 1; break checkCurrentState;
                    }
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            stack.push(1); // push inObject
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else switch(buffer[pos])
                    {
                        case '/':
                            pos++;
                            pos1 = pos;
                            result = readRequiredIdentifier(buffer, end, pos);
                            if (result.needMoreLookahead && !endWithEof)
                            {
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                stack.push(1); // push inObject
                                return pos0 - offset; // tokenized count
                            }
                            if (result.successful)
                            {
                                pos = result.newPos;
                                pos2 = pos;
                                if (pos >= end)
                                {
                                    if (!endWithEof)
                                    {
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                        stack.push(1); // push inObject
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === ':')
                                {
                                    pos++;
                                    pos3 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.AttributePrefix, isMissing: true, endPos: pos0 });
                                    tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.AttributeName, isMissing: false, endPos: pos2 });
                                    tokens.push({ type: TokenType.AttributeColon, isMissing: false, endPos: pos3 });
                                    currentState = 1; break checkCurrentState;
                                }
                                pos = pos2;
                            }
                            if (pos >= end)
                            {
                                if (!endWithEof)
                                {
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    stack.push(1); // push inObject
                                    return pos0 - offset; // tokenized count
                                }
                            }
                            else if (buffer[pos] === ':')
                            {
                                pos++;
                                pos2 = pos;
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                tokens.push({ type: TokenType.AttributePrefix, isMissing: true, endPos: pos0 });
                                tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos1 });
                                tokens.push({ type: TokenType.AttributeName, isMissing: true, endPos: pos1 });
                                tokens.push({ type: TokenType.AttributeColon, isMissing: false, endPos: pos2 });
                                currentState = 1; break checkCurrentState;
                            }
                            pos = pos1;
                            break;
                        case ':':
                            pos++;
                            pos1 = pos;
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            tokens.push({ type: TokenType.AttributePrefix, isMissing: false, endPos: pos0 });
                            tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos0 });
                            tokens.push({ type: TokenType.AttributeName, isMissing: true, endPos: pos0 });
                            tokens.push({ type: TokenType.AttributeColon, isMissing: false, endPos: pos1 });
                            currentState = 1; break checkCurrentState;
                        case '<':
                            pos++;
                            pos1 = pos;
                            result = readOptionalIdentifier(buffer, end, pos);
                            if (result.needMoreLookahead && !endWithEof)
                            {
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                stack.push(1); // push inObject
                                return pos0 - offset; // tokenized count
                            }
                            if (result.successful)
                            {
                                pos = result.newPos;
                                pos2 = pos;
                                if (pos >= end)
                                {
                                    if (!endWithEof)
                                    {
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                        stack.push(1); // push inObject
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === '<')
                                {
                                    pos++;
                                    pos3 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.HeredocStringStart1, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.HeredocStringDelimiter, isMissing: false, endPos: pos2 });
                                    tokens.push({ type: TokenType.HeredocStringStart2, isMissing: false, endPos: pos3 });
                                    state.identifier = buffer.substring(pos1, pos2);
                                    stack.push(1); // push inObject
                                    currentState = 5; break checkCurrentState;
                                }
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                tokens.push({ type: TokenType.StringStart, isMissing: false, endPos: pos1 });
                                lastWasAmbientToken = true;
                                stack.push(1); // push inObject
                                currentState = 6; break checkCurrentState;
                            }
                            pos = pos1;
                            break;
                        case '{':
                            pos++;
                            pos1 = pos;
                            if (pos >= end)
                            {
                                if (!endWithEof)
                                {
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    stack.push(1); // push inObject
                                    return pos0 - offset; // tokenized count
                                }
                            }
                            else switch(buffer[pos])
                            {
                                case '-':
                                    pos++;
                                    pos2 = pos;
                                    result = readOptionalIdentifier(buffer, end, pos);
                                    if (result.needMoreLookahead && !endWithEof)
                                    {
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                        stack.push(1); // push inObject
                                        return pos0 - offset; // tokenized count
                                    }
                                    if (result.successful)
                                    {
                                        pos = result.newPos;
                                        pos3 = pos;
                                        if (pos >= end)
                                        {
                                            if (!endWithEof)
                                            {
                                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                                stack.push(1); // push inObject
                                                return pos0 - offset; // tokenized count
                                            }
                                        }
                                        else if (buffer[pos] === '-')
                                        {
                                            pos++;
                                            pos4 = pos;
                                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                            tokens.push({ type: TokenType.CommentStart1, isMissing: false, endPos: pos2 });
                                            tokens.push({ type: TokenType.CommentDelimiter, isMissing: false, endPos: pos3 });
                                            tokens.push({ type: TokenType.CommentStart2, isMissing: false, endPos: pos4 });
                                            state.identifier = buffer.substring(pos2, pos3);
                                            stack.push(1); // push inObject
                                            currentState = 7; break checkCurrentState;
                                        }
                                        pos = pos3;
                                    }
                                    pos = pos2;
                                    break;
                                case '=':
                                    pos++;
                                    pos2 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.ObjectCast, isMissing: false, endPos: pos2 });
                                    stack.push(1); // push inObject
                                    currentState = 2; break checkCurrentState;
                                case '$':
                                    pos++;
                                    pos2 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.ObjectInference, isMissing: false, endPos: pos2 });
                                    stack.push(1); // push inObject
                                    currentState = 1; break checkCurrentState;
                            }
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                            stack.push(1); // push inObject
                            currentState = 2; break checkCurrentState;
                        case '[':
                            pos++;
                            pos1 = pos;
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            tokens.push({ type: TokenType.ArrayStart, isMissing: false, endPos: pos1 });
                            stack.push(1); // push inObject
                            currentState = 3; break checkCurrentState;
                        case '!':
                            pos++;
                            if (pos >= end)
                            {
                                if (!endWithEof)
                                {
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    stack.push(1); // push inObject
                                    return pos0 - offset; // tokenized count
                                }
                            }
                            else if (buffer[pos] === '[')
                            {
                                pos++;
                                pos2 = pos;
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                tokens.push({ type: TokenType.MarkupArrayStart, isMissing: false, endPos: pos2 });
                                stack.push(1); // push inObject
                                currentState = 4; break checkCurrentState;
                            }
                            break;
                        case '}':
                            pos++;
                            pos1 = pos;
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            tokens.push({ type: TokenType.ObjectEnd, isMissing: false, endPos: pos1 });
                            currentState = stack.pop(); break checkCurrentState;
                    }
                    result = readRequiredIdentifier(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof)
                    {
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        stack.push(1); // push inObject
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful)
                    {
                        pos = result.newPos;
                        pos1 = pos;
                        if (pos >= end)
                        {
                            if (!endWithEof)
                            {
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                stack.push(1); // push inObject
                                return pos0 - offset; // tokenized count
                            }
                        }
                        else switch(buffer[pos])
                        {
                            case '/':
                                pos++;
                                pos2 = pos;
                                result = readRequiredIdentifier(buffer, end, pos);
                                if (result.needMoreLookahead && !endWithEof)
                                {
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    stack.push(1); // push inObject
                                    return pos0 - offset; // tokenized count
                                }
                                if (result.successful)
                                {
                                    pos = result.newPos;
                                    pos3 = pos;
                                    if (pos >= end)
                                    {
                                        if (!endWithEof)
                                        {
                                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                            stack.push(1); // push inObject
                                            return pos0 - offset; // tokenized count
                                        }
                                    }
                                    else if (buffer[pos] === ':')
                                    {
                                        pos++;
                                        pos4 = pos;
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                        tokens.push({ type: TokenType.AttributePrefix, isMissing: false, endPos: pos1 });
                                        tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos2 });
                                        tokens.push({ type: TokenType.AttributeName, isMissing: false, endPos: pos3 });
                                        tokens.push({ type: TokenType.AttributeColon, isMissing: false, endPos: pos4 });
                                        currentState = 1; break checkCurrentState;
                                    }
                                    pos = pos3;
                                }
                                if (pos >= end)
                                {
                                    if (!endWithEof)
                                    {
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                        stack.push(1); // push inObject
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === ':')
                                {
                                    pos++;
                                    pos3 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.AttributePrefix, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos2 });
                                    tokens.push({ type: TokenType.AttributeName, isMissing: true, endPos: pos2 });
                                    tokens.push({ type: TokenType.AttributeColon, isMissing: false, endPos: pos3 });
                                    currentState = 1; break checkCurrentState;
                                }
                                pos = pos2;
                                break;
                            case ':':
                                pos++;
                                pos2 = pos;
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                tokens.push({ type: TokenType.AttributePrefix, isMissing: false, endPos: pos0 });
                                tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos0 });
                                tokens.push({ type: TokenType.AttributeName, isMissing: false, endPos: pos1 });
                                tokens.push({ type: TokenType.AttributeColon, isMissing: false, endPos: pos2 });
                                currentState = 1; break checkCurrentState;
                        }
                        result = readPrimitive(buffer, end, pos);
                        if (result.needMoreLookahead && !endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            stack.push(1); // push inObject
                            return pos0 - offset; // tokenized count
                        }
                        if (result.successful)
                        {
                            pos = result.newPos;
                            pos2 = pos;
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            tokens.push({ type: TokenType.Primitive, isMissing: false, endPos: pos2 });
                            currentState = 1; break checkCurrentState;
                        }
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        tokens.push({ type: TokenType.Primitive, isMissing: false, endPos: pos1 });
                        currentState = 1; break checkCurrentState;
                    }
                    result = readPrimitive(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof)
                    {
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        stack.push(1); // push inObject
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful)
                    {
                        pos = result.newPos;
                        pos1 = pos;
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        tokens.push({ type: TokenType.Primitive, isMissing: false, endPos: pos1 });
                        currentState = 1; break checkCurrentState;
                    }
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            stack.push(1); // push inObject
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else // any
                    {
                        pos++;
                        pos1 = pos;
                        lastWasAmbientToken = true;
                        currentState = 1; break checkCurrentState;
                    }
                    if (endWithEof && pos === end)
                    {
                        pos1 = pos;
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        tokens.push({ type: TokenType.ObjectEnd, isMissing: true, endPos: pos1 });
                        currentState = stack.pop(); break checkCurrentState;
                    }
                    pos = pos0;
                    throw new Error();
                case 2: // inObjectStart
                    pos0 = pos;
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            stack.push(2); // push inObjectStart
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else if (buffer[pos] === '/')
                    {
                        pos++;
                        pos1 = pos;
                        result = readRequiredIdentifier(buffer, end, pos);
                        if (result.needMoreLookahead && !endWithEof)
                        {
                            stack.push(2); // push inObjectStart
                            return pos0 - offset; // tokenized count
                        }
                        if (result.successful)
                        {
                            pos = result.newPos;
                            pos2 = pos;
                            tokens.push({ type: TokenType.TypePrefix, isMissing: true, endPos: pos0 });
                            tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos1 });
                            tokens.push({ type: TokenType.TypeName, isMissing: false, endPos: pos2 });
                            currentState = 1; break checkCurrentState;
                        }
                        tokens.push({ type: TokenType.TypePrefix, isMissing: true, endPos: pos0 });
                        tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos1 });
                        tokens.push({ type: TokenType.TypeName, isMissing: true, endPos: pos1 });
                        currentState = 1; break checkCurrentState;
                    }
                    result = readRequiredIdentifier(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof)
                    {
                        stack.push(2); // push inObjectStart
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful)
                    {
                        pos = result.newPos;
                        pos1 = pos;
                        if (pos >= end)
                        {
                            if (!endWithEof)
                            {
                                stack.push(2); // push inObjectStart
                                return pos0 - offset; // tokenized count
                            }
                        }
                        else if (buffer[pos] === '/')
                        {
                            pos++;
                            pos2 = pos;
                            result = readRequiredIdentifier(buffer, end, pos);
                            if (result.needMoreLookahead && !endWithEof)
                            {
                                stack.push(2); // push inObjectStart
                                return pos0 - offset; // tokenized count
                            }
                            if (result.successful)
                            {
                                pos = result.newPos;
                                pos3 = pos;
                                tokens.push({ type: TokenType.TypePrefix, isMissing: false, endPos: pos1 });
                                tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos2 });
                                tokens.push({ type: TokenType.TypeName, isMissing: false, endPos: pos3 });
                                currentState = 1; break checkCurrentState;
                            }
                            pos = pos2;
                        }
                        tokens.push({ type: TokenType.TypePrefix, isMissing: false, endPos: pos0 });
                        tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos0 });
                        tokens.push({ type: TokenType.TypeName, isMissing: false, endPos: pos1 });
                        currentState = 1; break checkCurrentState;
                    }
                    tokens.push({ type: TokenType.TypePrefix, isMissing: false, endPos: pos0 });
                    tokens.push({ type: TokenType.PrefixSeparator, isMissing: false, endPos: pos0 });
                    tokens.push({ type: TokenType.TypeName, isMissing: true, endPos: pos0 });
                    currentState = 1; break checkCurrentState;
                case 3: // inArray
                    pos0 = pos;
                    result = readWhitespace(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof)
                    {
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        stack.push(3); // push inArray
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful)
                    {
                        pos = result.newPos;
                        pos1 = pos;
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        tokens.push({ type: TokenType.Whitespace, isMissing: false, endPos: pos1 });
                        currentState = 3; break checkCurrentState;
                    }
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            stack.push(3); // push inArray
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else switch(buffer[pos])
                    {
                        case '<':
                            pos++;
                            pos1 = pos;
                            result = readOptionalIdentifier(buffer, end, pos);
                            if (result.needMoreLookahead && !endWithEof)
                            {
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                stack.push(3); // push inArray
                                return pos0 - offset; // tokenized count
                            }
                            if (result.successful)
                            {
                                pos = result.newPos;
                                pos2 = pos;
                                if (pos >= end)
                                {
                                    if (!endWithEof)
                                    {
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                        stack.push(3); // push inArray
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === '<')
                                {
                                    pos++;
                                    pos3 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.HeredocStringStart1, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.HeredocStringDelimiter, isMissing: false, endPos: pos2 });
                                    tokens.push({ type: TokenType.HeredocStringStart2, isMissing: false, endPos: pos3 });
                                    state.identifier = buffer.substring(pos1, pos2);
                                    stack.push(3); // push inArray
                                    currentState = 5; break checkCurrentState;
                                }
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                tokens.push({ type: TokenType.StringStart, isMissing: false, endPos: pos1 });
                                lastWasAmbientToken = true;
                                stack.push(3); // push inArray
                                currentState = 6; break checkCurrentState;
                            }
                            pos = pos1;
                            break;
                        case '{':
                            pos++;
                            pos1 = pos;
                            if (pos >= end)
                            {
                                if (!endWithEof)
                                {
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    stack.push(3); // push inArray
                                    return pos0 - offset; // tokenized count
                                }
                            }
                            else switch(buffer[pos])
                            {
                                case '-':
                                    pos++;
                                    pos2 = pos;
                                    result = readOptionalIdentifier(buffer, end, pos);
                                    if (result.needMoreLookahead && !endWithEof)
                                    {
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                        stack.push(3); // push inArray
                                        return pos0 - offset; // tokenized count
                                    }
                                    if (result.successful)
                                    {
                                        pos = result.newPos;
                                        pos3 = pos;
                                        if (pos >= end)
                                        {
                                            if (!endWithEof)
                                            {
                                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                                stack.push(3); // push inArray
                                                return pos0 - offset; // tokenized count
                                            }
                                        }
                                        else if (buffer[pos] === '-')
                                        {
                                            pos++;
                                            pos4 = pos;
                                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                            tokens.push({ type: TokenType.CommentStart1, isMissing: false, endPos: pos2 });
                                            tokens.push({ type: TokenType.CommentDelimiter, isMissing: false, endPos: pos3 });
                                            tokens.push({ type: TokenType.CommentStart2, isMissing: false, endPos: pos4 });
                                            state.identifier = buffer.substring(pos2, pos3);
                                            stack.push(3); // push inArray
                                            currentState = 7; break checkCurrentState;
                                        }
                                        pos = pos3;
                                    }
                                    pos = pos2;
                                    break;
                                case '=':
                                    pos++;
                                    pos2 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.ObjectCast, isMissing: false, endPos: pos2 });
                                    stack.push(3); // push inArray
                                    currentState = 2; break checkCurrentState;
                                case '$':
                                    pos++;
                                    pos2 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.ObjectInference, isMissing: false, endPos: pos2 });
                                    stack.push(3); // push inArray
                                    currentState = 1; break checkCurrentState;
                            }
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                            stack.push(3); // push inArray
                            currentState = 2; break checkCurrentState;
                        case '[':
                            pos++;
                            pos1 = pos;
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            tokens.push({ type: TokenType.ArrayStart, isMissing: false, endPos: pos1 });
                            stack.push(3); // push inArray
                            currentState = 3; break checkCurrentState;
                        case '!':
                            pos++;
                            if (pos >= end)
                            {
                                if (!endWithEof)
                                {
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                    stack.push(3); // push inArray
                                    return pos0 - offset; // tokenized count
                                }
                            }
                            else if (buffer[pos] === '[')
                            {
                                pos++;
                                pos2 = pos;
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                                tokens.push({ type: TokenType.MarkupArrayStart, isMissing: false, endPos: pos2 });
                                stack.push(3); // push inArray
                                currentState = 4; break checkCurrentState;
                            }
                            break;
                        case ']':
                            pos++;
                            pos1 = pos;
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            tokens.push({ type: TokenType.ArrayEnd, isMissing: false, endPos: pos1 });
                            currentState = stack.pop(); break checkCurrentState;
                    }
                    result = readRequiredIdentifier(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof)
                    {
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        stack.push(3); // push inArray
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful)
                    {
                        pos = result.newPos;
                        pos1 = pos;
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        tokens.push({ type: TokenType.Primitive, isMissing: false, endPos: pos1 });
                        currentState = 3; break checkCurrentState;
                    }
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                            stack.push(3); // push inArray
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else // any
                    {
                        pos++;
                        pos1 = pos;
                        lastWasAmbientToken = true;
                        currentState = 3; break checkCurrentState;
                    }
                    if (endWithEof && pos === end)
                    {
                        pos1 = pos;
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos0 }); }
                        tokens.push({ type: TokenType.ArrayEnd, isMissing: true, endPos: pos1 });
                        currentState = stack.pop(); break checkCurrentState;
                    }
                    pos = pos0;
                    throw new Error();
                case 4: // inMarkupArray
                    pos0 = pos;
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                            stack.push(4); // push inMarkupArray
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else switch(buffer[pos])
                    {
                        case '<':
                            pos++;
                            pos1 = pos;
                            result = readOptionalIdentifier(buffer, end, pos);
                            if (result.needMoreLookahead && !endWithEof)
                            {
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                                stack.push(4); // push inMarkupArray
                                return pos0 - offset; // tokenized count
                            }
                            if (result.successful)
                            {
                                pos = result.newPos;
                                pos2 = pos;
                                if (pos >= end)
                                {
                                    if (!endWithEof)
                                    {
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                                        stack.push(4); // push inMarkupArray
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === '<')
                                {
                                    pos++;
                                    pos3 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.HeredocStringStart1, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.HeredocStringDelimiter, isMissing: false, endPos: pos2 });
                                    tokens.push({ type: TokenType.HeredocStringStart2, isMissing: false, endPos: pos3 });
                                    state.identifier = buffer.substring(pos1, pos2);
                                    stack.push(4); // push inMarkupArray
                                    currentState = 5; break checkCurrentState;
                                }
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                                tokens.push({ type: TokenType.StringStart, isMissing: false, endPos: pos1 });
                                lastWasAmbientToken = true;
                                stack.push(4); // push inMarkupArray
                                currentState = 6; break checkCurrentState;
                            }
                            pos = pos1;
                            break;
                        case '{':
                            pos++;
                            pos1 = pos;
                            if (pos >= end)
                            {
                                if (!endWithEof)
                                {
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                                    stack.push(4); // push inMarkupArray
                                    return pos0 - offset; // tokenized count
                                }
                            }
                            else switch(buffer[pos])
                            {
                                case '-':
                                    pos++;
                                    pos2 = pos;
                                    result = readOptionalIdentifier(buffer, end, pos);
                                    if (result.needMoreLookahead && !endWithEof)
                                    {
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                                        stack.push(4); // push inMarkupArray
                                        return pos0 - offset; // tokenized count
                                    }
                                    if (result.successful)
                                    {
                                        pos = result.newPos;
                                        pos3 = pos;
                                        if (pos >= end)
                                        {
                                            if (!endWithEof)
                                            {
                                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                                                stack.push(4); // push inMarkupArray
                                                return pos0 - offset; // tokenized count
                                            }
                                        }
                                        else if (buffer[pos] === '-')
                                        {
                                            pos++;
                                            pos4 = pos;
                                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                                            tokens.push({ type: TokenType.CommentStart1, isMissing: false, endPos: pos2 });
                                            tokens.push({ type: TokenType.CommentDelimiter, isMissing: false, endPos: pos3 });
                                            tokens.push({ type: TokenType.CommentStart2, isMissing: false, endPos: pos4 });
                                            state.identifier = buffer.substring(pos2, pos3);
                                            stack.push(4); // push inMarkupArray
                                            currentState = 7; break checkCurrentState;
                                        }
                                        pos = pos3;
                                    }
                                    pos = pos2;
                                    break;
                                case '=':
                                    pos++;
                                    pos2 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.ObjectCast, isMissing: false, endPos: pos2 });
                                    stack.push(4); // push inMarkupArray
                                    currentState = 2; break checkCurrentState;
                                case '$':
                                    pos++;
                                    pos2 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.ObjectInference, isMissing: false, endPos: pos2 });
                                    stack.push(4); // push inMarkupArray
                                    currentState = 1; break checkCurrentState;
                            }
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                            tokens.push({ type: TokenType.ObjectStart, isMissing: false, endPos: pos1 });
                            stack.push(4); // push inMarkupArray
                            currentState = 2; break checkCurrentState;
                        case '[':
                            pos++;
                            pos1 = pos;
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                            tokens.push({ type: TokenType.ArrayStart, isMissing: false, endPos: pos1 });
                            stack.push(4); // push inMarkupArray
                            currentState = 3; break checkCurrentState;
                        case '!':
                            pos++;
                            if (pos >= end)
                            {
                                if (!endWithEof)
                                {
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                                    stack.push(4); // push inMarkupArray
                                    return pos0 - offset; // tokenized count
                                }
                            }
                            else if (buffer[pos] === '[')
                            {
                                pos++;
                                pos2 = pos;
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                                tokens.push({ type: TokenType.MarkupArrayStart, isMissing: false, endPos: pos2 });
                                stack.push(4); // push inMarkupArray
                                currentState = 4; break checkCurrentState;
                            }
                            break;
                        case ']':
                            pos++;
                            pos1 = pos;
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                            tokens.push({ type: TokenType.MarkupArrayEnd, isMissing: false, endPos: pos1 });
                            currentState = stack.pop(); break checkCurrentState;
                    }
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                            stack.push(4); // push inMarkupArray
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else // any
                    {
                        pos++;
                        pos1 = pos;
                        lastWasAmbientToken = true;
                        currentState = 4; break checkCurrentState;
                    }
                    if (endWithEof && pos === end)
                    {
                        pos1 = pos;
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.MarkupString, isMissing: false, endPos: pos0 }); }
                        tokens.push({ type: TokenType.MarkupArrayEnd, isMissing: true, endPos: pos1 });
                        currentState = stack.pop(); break checkCurrentState;
                    }
                    pos = pos0;
                    throw new Error();
                case 5: // inHeredocString
                    pos0 = pos;
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 }); }
                            stack.push(5); // push inHeredocString
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else switch(buffer[pos])
                    {
                        case '>':
                            pos++;
                            pos1 = pos;
                            result = readMatchIdentifier(buffer, end, pos, state.identifier);
                            if (result.needMoreLookahead && !endWithEof)
                            {
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 }); }
                                stack.push(5); // push inHeredocString
                                return pos0 - offset; // tokenized count
                            }
                            if (result.successful)
                            {
                                pos = result.newPos;
                                pos2 = pos;
                                if (pos >= end)
                                {
                                    if (!endWithEof)
                                    {
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 }); }
                                        stack.push(5); // push inHeredocString
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === '>')
                                {
                                    pos++;
                                    pos3 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.HeredocStringEnd1, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.HeredocStringDelimiter, isMissing: false, endPos: pos2 });
                                    tokens.push({ type: TokenType.HeredocStringEnd2, isMissing: false, endPos: pos3 });
                                    state.identifier = undefined;
                                    currentState = stack.pop(); break checkCurrentState;
                                }
                                lastWasAmbientToken = true;
                                currentState = 5; break checkCurrentState;
                            }
                            lastWasAmbientToken = true;
                            currentState = 5; break checkCurrentState;
                        case '\\':
                            pos++;
                            pos1 = pos;
                            result = readMatchIdentifier(buffer, end, pos, state.identifier);
                            if (result.needMoreLookahead && !endWithEof)
                            {
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 }); }
                                stack.push(5); // push inHeredocString
                                return pos0 - offset; // tokenized count
                            }
                            if (result.successful)
                            {
                                pos = result.newPos;
                                pos2 = pos;
                                if (pos >= end)
                                {
                                    if (!endWithEof)
                                    {
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 }); }
                                        stack.push(5); // push inHeredocString
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === '\\')
                                {
                                    pos++;
                                    pos3 = pos;
                                    result = readEscape(buffer, end, pos);
                                    if (result.needMoreLookahead && !endWithEof)
                                    {
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 }); }
                                        stack.push(5); // push inHeredocString
                                        return pos0 - offset; // tokenized count
                                    }
                                    if (result.successful)
                                    {
                                        pos = result.newPos;
                                        pos4 = pos;
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 }); }
                                        tokens.push({ type: TokenType.HeredocStringEscapeSeq, isMissing: false, endPos: pos1 });
                                        tokens.push({ type: TokenType.HeredocStringDelimiter, isMissing: false, endPos: pos2 });
                                        tokens.push({ type: TokenType.EscapeSeqStart, isMissing: false, endPos: pos3 });
                                        tokens.push({ type: TokenType.EscapeSeq, isMissing: false, endPos: pos4 });
                                        currentState = 5; break checkCurrentState;
                                    }
                                    pos = pos3;
                                }
                                lastWasAmbientToken = true;
                                currentState = 5; break checkCurrentState;
                            }
                            lastWasAmbientToken = true;
                            currentState = 5; break checkCurrentState;
                    }
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 }); }
                            stack.push(5); // push inHeredocString
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else // any
                    {
                        pos++;
                        pos1 = pos;
                        lastWasAmbientToken = true;
                        currentState = 5; break checkCurrentState;
                    }
                    if (endWithEof && pos === end)
                    {
                        pos1 = pos;
                        if (endWithEof && pos === end)
                        {
                            pos2 = pos;
                            if (endWithEof && pos === end)
                            {
                                pos3 = pos;
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.HeredocString, isMissing: false, endPos: pos0 }); }
                                tokens.push({ type: TokenType.HeredocStringEnd1, isMissing: true, endPos: pos1 });
                                tokens.push({ type: TokenType.HeredocStringDelimiter, isMissing: true, endPos: pos2 });
                                tokens.push({ type: TokenType.HeredocStringEnd2, isMissing: true, endPos: pos3 });
                                state.identifier = undefined;
                                currentState = stack.pop(); break checkCurrentState;
                            }
                            pos = pos2;
                        }
                        pos = pos1;
                    }
                    pos = pos0;
                    throw new Error();
                case 6: // inString
                    pos0 = pos;
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 }); }
                            stack.push(6); // push inString
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else if (buffer[pos] === '\\')
                    {
                        pos++;
                        pos1 = pos;
                        result = readEscape(buffer, end, pos);
                        if (result.needMoreLookahead && !endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 }); }
                            stack.push(6); // push inString
                            return pos0 - offset; // tokenized count
                        }
                        if (result.successful)
                        {
                            pos = result.newPos;
                            pos2 = pos;
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 }); }
                            tokens.push({ type: TokenType.EscapeSeqStart, isMissing: false, endPos: pos1 });
                            tokens.push({ type: TokenType.EscapeSeq, isMissing: false, endPos: pos2 });
                            currentState = 6; break checkCurrentState;
                        }
                        pos = pos1;
                    }
                    result = readLineBreak(buffer, end, pos);
                    if (result.needMoreLookahead && !endWithEof)
                    {
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 }); }
                        stack.push(6); // push inString
                        return pos0 - offset; // tokenized count
                    }
                    if (result.successful)
                    {
                        pos = result.newPos;
                        pos1 = pos;
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 }); }
                        tokens.push({ type: TokenType.StringEnd, isMissing: true, endPos: pos0 });
                        tokens.push({ type: TokenType.Whitespace, isMissing: false, endPos: pos1 });
                        currentState = stack.pop(); break checkCurrentState;
                    }
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 }); }
                            stack.push(6); // push inString
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else if (buffer[pos] === '>')
                    {
                        pos++;
                        pos1 = pos;
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 }); }
                        tokens.push({ type: TokenType.StringEnd, isMissing: false, endPos: pos1 });
                        currentState = stack.pop(); break checkCurrentState;
                    }
                    if (endWithEof && pos === end)
                    {
                        pos1 = pos;
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 }); }
                        tokens.push({ type: TokenType.StringEnd, isMissing: true, endPos: pos1 });
                        currentState = stack.pop(); break checkCurrentState;
                    }
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 }); }
                            stack.push(6); // push inString
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else if (buffer[pos] === '<')
                    {
                        pos++;
                        pos1 = pos;
                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 }); }
                        tokens.push({ type: TokenType.Invalid, isMissing: false, endPos: pos1 });
                        currentState = 6; break checkCurrentState;
                    }
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.StringText, isMissing: false, endPos: pos0 }); }
                            stack.push(6); // push inString
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else // any
                    {
                        pos++;
                        pos1 = pos;
                        lastWasAmbientToken = true;
                        currentState = 6; break checkCurrentState;
                    }
                    pos = pos0;
                    throw new Error();
                case 7: // inComment
                    pos0 = pos;
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Comment, isMissing: false, endPos: pos0 }); }
                            stack.push(7); // push inComment
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else if (buffer[pos] === '-')
                    {
                        pos++;
                        pos1 = pos;
                        result = readMatchIdentifier(buffer, end, pos, state.identifier);
                        if (result.needMoreLookahead && !endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Comment, isMissing: false, endPos: pos0 }); }
                            stack.push(7); // push inComment
                            return pos0 - offset; // tokenized count
                        }
                        if (result.successful)
                        {
                            pos = result.newPos;
                            pos2 = pos;
                            if (pos >= end)
                            {
                                if (!endWithEof)
                                {
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Comment, isMissing: false, endPos: pos0 }); }
                                    stack.push(7); // push inComment
                                    return pos0 - offset; // tokenized count
                                }
                            }
                            else if (buffer[pos] === '-')
                            {
                                pos++;
                                if (pos >= end)
                                {
                                    if (!endWithEof)
                                    {
                                        if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Comment, isMissing: false, endPos: pos0 }); }
                                        stack.push(7); // push inComment
                                        return pos0 - offset; // tokenized count
                                    }
                                }
                                else if (buffer[pos] === '}')
                                {
                                    pos++;
                                    pos4 = pos;
                                    if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Comment, isMissing: false, endPos: pos0 }); }
                                    tokens.push({ type: TokenType.CommentEnd1, isMissing: false, endPos: pos1 });
                                    tokens.push({ type: TokenType.CommentDelimiter, isMissing: false, endPos: pos2 });
                                    tokens.push({ type: TokenType.CommentEnd2, isMissing: false, endPos: pos4 });
                                    state.identifier = undefined;
                                    currentState = stack.pop(); break checkCurrentState;
                                }
                            }
                            pos = pos2;
                        }
                        pos = pos1;
                    }
                    if (endWithEof && pos === end)
                    {
                        pos1 = pos;
                        if (endWithEof && pos === end)
                        {
                            pos2 = pos;
                            if (endWithEof && pos === end)
                            {
                                pos3 = pos;
                                if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Comment, isMissing: false, endPos: pos0 }); }
                                tokens.push({ type: TokenType.CommentEnd1, isMissing: true, endPos: pos1 });
                                tokens.push({ type: TokenType.CommentDelimiter, isMissing: true, endPos: pos2 });
                                tokens.push({ type: TokenType.CommentEnd2, isMissing: true, endPos: pos3 });
                                state.identifier = undefined;
                                currentState = stack.pop(); break checkCurrentState;
                            }
                            pos = pos2;
                        }
                        pos = pos1;
                    }
                    if (pos >= end)
                    {
                        if (!endWithEof)
                        {
                            if (lastWasAmbientToken) { lastWasAmbientToken = false; tokens.push({ type: TokenType.Comment, isMissing: false, endPos: pos0 }); }
                            stack.push(7); // push inComment
                            return pos0 - offset; // tokenized count
                        }
                    }
                    else // any
                    {
                        pos++;
                        pos1 = pos;
                        lastWasAmbientToken = true;
                        currentState = 7; break checkCurrentState;
                    }
                    pos = pos0;
                    throw new Error();

            }
        }
    }
}

function tokenize2(line: HTMLElement, s: TokenizerState, eof: boolean) {
    var text = line.innerText;
    var tokens = [] as Token[];
    Tokenizer.Tokenize(s, text, 0, text.length, eof, tokens);
	while (line.firstChild) {
    	line.removeChild(line.firstChild);
	}
    var lastPos = 0;
    for (var t of tokens) {
        var tokenText = text.substring(lastPos, t.endPos);
        lastPos = t.endPos;
		var span = document.createElement("span");
		span.textContent = tokenText;
		span.className = `token ${TokenType[t.type]}`;
        line.appendChild(span);
    }
}

function tokenize() {

	var s: TokenizerState = { stack:[], identifier: undefined };
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

    for (var html of document.querySelectorAll("pre[lang='tyml'] code") as HTMLElement[]) {
        tokenize2(html, null, true);
    }
}

var pjaxContainer = document.querySelectorAll('#js-repo-pjax-container')[0];

if (pjaxContainer) {
    // use MutationObserver as we can't inject into History API
    new MutationObserver(update).observe(pjaxContainer, {childList: true});
    
    // initial "update"
    update();
}
