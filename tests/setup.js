// Jest setup file
const fetchMock = require('jest-fetch-mock');

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock fetch
global.fetch = fetchMock;
global.fetchMock = fetchMock;

// Mock window and DOM methods
global.window = global.window || {};
Object.defineProperty(global.window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: (prop) => {
      const styles = {
        '--tbl-white': '#ffffff',
        '--tbl-blue': '#8eb3f0',
        '--tbl-green': '#bbe5d1',
        '--tbl-red': '#f8caca',
      };
      return styles[prop] || '';
    }
  })
});

// Mock SVG methods
global.SVGElement = class SVGElement {};
global.SVGGraphicsElement = class SVGGraphicsElement {};
global.SVGPoint = class SVGPoint {
  constructor() {
    this.x = 0;
    this.y = 0;
  }
  matrixTransform(matrix) {
    return { x: this.x, y: this.y };
  }
};

// Mock document methods
global.document.createElementNS = jest.fn((namespace, tagName) => {
  const element = {
    tagName: tagName.toUpperCase(),
    attributes: {},
    setAttribute: function(name, value) {
      this.attributes[name] = value;
    },
    getAttribute: function(name) {
      return this.attributes[name];
    },
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
      toggle: jest.fn()
    },
    hidden: false,
    nextSibling: null,
    firstChild: null,
    children: []
  };

  if (tagName === 'svg') {
    element.createSVGPoint = jest.fn(() => new global.SVGPoint());
    element.getScreenCTM = jest.fn(() => ({
      inverse: jest.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }))
    }));
  }

  return element;
});

global.document.createElement = jest.fn((tagName) => {
  const element = {
    tagName: tagName.toUpperCase(),
    value: '',
    textContent: '',
    innerHTML: '',
    attributes: {},
    setAttribute: function(name, value) {
      this.attributes[name] = value;
    },
    getAttribute: function(name) {
      return this.attributes[name];
    },
    appendChild: jest.fn(),
    children: [],
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn(),
      toggle: jest.fn()
    },
    hidden: false,
    nextSibling: null,
    firstChild: null
  };
  return element;
});

global.document.querySelector = jest.fn();
global.document.getElementById = jest.fn();
