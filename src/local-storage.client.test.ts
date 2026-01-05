import {assert} from '@augment-vir/assert';
import {randomString} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {defineShape} from 'object-shape-tester';
import {LocalStorageClient} from './local-storage.client.js';

const testShapes = {
    stringValue: defineShape('default string'),
    numberValue: defineShape(42),
    booleanValue: defineShape(true),
    objectValue: defineShape({
        name: '',
        age: 0,
    }),
    arrayValue: defineShape(['']),
    nestedValue: defineShape({
        outer: {
            inner: '',
        },
    }),
};

describe(LocalStorageClient.name, () => {
    function createTestClient() {
        const storeName = `test-store-${randomString(32)}`;
        const client = new LocalStorageClient(testShapes, {storeName});
        client.clear();
        return client;
    }

    describe('constructor', () => {
        it('uses default store name when not provided', () => {
            const client = new LocalStorageClient(testShapes);
            assert.strictEquals(client.storeName, 'local-storage-client');
        });

        it('uses custom store name when provided', () => {
            const storeName = 'custom-store-name';
            const client = new LocalStorageClient(testShapes, {storeName});
            assert.strictEquals(client.storeName, storeName);
        });
    });

    describe('set', () => {
        it('stores a string value', () => {
            const client = createTestClient();

            client.set.stringValue('hello world');

            assert.strictEquals(client.get.stringValue(), 'hello world');
        });

        it('stores a number value', () => {
            const client = createTestClient();

            client.set.numberValue(123);

            assert.strictEquals(client.get.numberValue(), 123);
        });

        it('stores a boolean value', () => {
            const client = createTestClient();

            client.set.booleanValue(false);

            assert.strictEquals(client.get.booleanValue(), false);
        });

        it('stores an object value', () => {
            const client = createTestClient();

            const objectValue = {name: 'John', age: 30};
            client.set.objectValue(objectValue);

            assert.deepEquals(client.get.objectValue(), objectValue);
        });

        it('stores an array value', () => {
            const client = createTestClient();

            const arrayValue = [
                'a',
                'b',
                'c',
            ];
            client.set.arrayValue(arrayValue);

            assert.deepEquals(client.get.arrayValue(), arrayValue);
        });

        it('stores a nested object value', () => {
            const client = createTestClient();

            const nestedValue = {outer: {inner: 'deep value'}};
            client.set.nestedValue(nestedValue);

            assert.deepEquals(client.get.nestedValue(), nestedValue);
        });

        it('preserves existing values when setting a new one', () => {
            const client = createTestClient();

            client.set.stringValue('first');
            client.set.numberValue(999);

            assert.strictEquals(client.get.stringValue(), 'first');
            assert.strictEquals(client.get.numberValue(), 999);
        });

        it('overwrites existing value with same key', () => {
            const client = createTestClient();

            client.set.stringValue('initial');
            client.set.stringValue('updated');

            assert.strictEquals(client.get.stringValue(), 'updated');
        });

        it('throws error for invalid shape', () => {
            const client = createTestClient();

            assert.throws(() => {
                // @ts-expect-error intentionally passing wrong type
                client.set.stringValue(123);
            });
        });

        it('throws error for invalid object shape', () => {
            const client = createTestClient();

            assert.throws(() => {
                // @ts-expect-error intentionally passing wrong type
                client.set.objectValue({wrongKey: 'value'});
            });
        });

        it('allows extra keys in objects', () => {
            const client = createTestClient();

            const objectWithExtra = {name: 'John', age: 30, extra: 'allowed'} as {
                name: string;
                age: number;
            };
            client.set.objectValue(objectWithExtra);

            assert.deepEquals(client.get.objectValue(), objectWithExtra);
        });
    });

    describe('get', () => {
        it('returns undefined for non-existent key', () => {
            const client = createTestClient();

            const result = client.get.stringValue();
            assert.isUndefined(result);
        });

        it('retrieves a stored string value', () => {
            const client = createTestClient();

            client.set.stringValue('test value');
            const result = client.get.stringValue();

            assert.strictEquals(result, 'test value');
        });

        it('retrieves a stored number value', () => {
            const client = createTestClient();

            client.set.numberValue(456);
            const result = client.get.numberValue();

            assert.strictEquals(result, 456);
        });

        it('retrieves a stored boolean value', () => {
            const client = createTestClient();

            client.set.booleanValue(false);
            const result = client.get.booleanValue();

            assert.strictEquals(result, false);
        });

        it('retrieves a stored object value', () => {
            const client = createTestClient();

            const objectValue = {name: 'Jane', age: 25};
            client.set.objectValue(objectValue);
            const result = client.get.objectValue();

            assert.deepEquals(result, objectValue);
        });

        it('retrieves a stored array value', () => {
            const client = createTestClient();

            const arrayValue = [
                'x',
                'y',
                'z',
            ];
            client.set.arrayValue(arrayValue);
            const result = client.get.arrayValue();

            assert.deepEquals(result, arrayValue);
        });

        it('retrieves a stored nested object value', () => {
            const client = createTestClient();

            const nestedValue = {outer: {inner: 'nested content'}};
            client.set.nestedValue(nestedValue);
            const result = client.get.nestedValue();

            assert.deepEquals(result, nestedValue);
        });

        it('returns undefined for corrupted value in storage', () => {
            const client = createTestClient();

            // Manually set an invalid value in storage
            globalThis.localStorage.setItem(
                client.storeName,
                JSON.stringify({stringValue: 123}), // wrong type
            );

            const result = client.get.stringValue();
            assert.isUndefined(result);
        });
    });

    describe('delete', () => {
        it('removes a stored value', () => {
            const client = createTestClient();

            client.set.stringValue('to be deleted');
            client.delete.stringValue();

            const result = client.get.stringValue();
            assert.isUndefined(result);
        });

        it('does not affect other stored values', () => {
            const client = createTestClient();

            client.set.stringValue('keep me');
            client.set.numberValue(100);
            client.delete.numberValue();

            assert.strictEquals(client.get.stringValue(), 'keep me');
            assert.isUndefined(client.get.numberValue());
        });

        it('does not throw when deleting non-existent key', () => {
            const client = createTestClient();

            // Should not throw
            client.delete.stringValue();
            assert.isUndefined(client.get.stringValue());
        });
    });

    describe('getAllValues', () => {
        it('returns empty object when storage is empty', () => {
            const client = createTestClient();

            const result = client.getAllValues();
            assert.deepEquals(result, {});
        });

        it('returns all stored values', () => {
            const client = createTestClient();

            client.set.stringValue('test');
            client.set.numberValue(42);
            client.set.booleanValue(true);

            const result = client.getAllValues();

            assert.strictEquals(result.stringValue, 'test');
            assert.strictEquals(result.numberValue, 42);
            assert.strictEquals(result.booleanValue, true);
        });

        it('excludes values not matching shape definitions', () => {
            const client = createTestClient();

            // Manually add an unknown key to storage
            globalThis.localStorage.setItem(
                client.storeName,
                JSON.stringify({
                    stringValue: 'valid',
                    unknownKey: 'should be excluded',
                }),
            );

            const result = client.getAllValues();

            assert.strictEquals(result.stringValue, 'valid');
            assert.isUndefined((result as Record<string, unknown>)['unknownKey']);
        });

        it('excludes values that do not match their shape', () => {
            const client = createTestClient();

            // Manually add invalid values to storage
            globalThis.localStorage.setItem(
                client.storeName,
                JSON.stringify({
                    stringValue: 123, // wrong type
                    numberValue: 'not a number', // wrong type
                }),
            );

            const result = client.getAllValues();

            assert.isUndefined(result.stringValue);
            assert.isUndefined(result.numberValue);
        });

        it('returns empty object when storage is corrupt JSON', () => {
            const client = createTestClient();

            // Manually set corrupt JSON
            globalThis.localStorage.setItem(client.storeName, 'not valid json {{{');

            const result = client.getAllValues();
            assert.deepEquals(result, {});
        });

        it('throws error on corrupt JSON when throwErrorOnFailure is true', () => {
            const client = createTestClient();

            // Manually set corrupt JSON
            globalThis.localStorage.setItem(client.storeName, 'not valid json {{{');

            assert.throws(
                () => {
                    client.getAllValues({throwErrorOnFailure: true});
                },
                {matchMessage: /corrupt/i},
            );
        });

        it('throws error on invalid shape when throwErrorOnFailure is true', () => {
            const client = createTestClient();

            // Manually add invalid value to storage
            globalThis.localStorage.setItem(
                client.storeName,
                JSON.stringify({
                    stringValue: 123, // wrong type
                }),
            );

            assert.throws(() => {
                client.getAllValues({throwErrorOnFailure: true});
            });
        });

        it('allows extra keys in stored objects when validating', () => {
            const client = createTestClient();

            // Manually add object with extra keys
            globalThis.localStorage.setItem(
                client.storeName,
                JSON.stringify({
                    objectValue: {name: 'Test', age: 20, extraKey: 'extra'},
                }),
            );

            const result = client.getAllValues();

            assert.deepEquals(result.objectValue, {name: 'Test', age: 20, extraKey: 'extra'});
        });
    });

    describe('multiple clients with different stores', () => {
        it('isolated storage between clients with different store names', () => {
            const client1 = createTestClient();
            const client2 = createTestClient();

            client1.set.stringValue('from client 1');
            client2.set.stringValue('from client 2');

            assert.strictEquals(client1.get.stringValue(), 'from client 1');
            assert.strictEquals(client2.get.stringValue(), 'from client 2');
        });

        it('same store name shares storage', () => {
            const client1 = createTestClient();
            const client2 = new LocalStorageClient(testShapes, {storeName: client1.storeName});

            client1.set.stringValue('shared value');

            assert.strictEquals(client2.get.stringValue(), 'shared value');
        });
    });

    describe('edge cases', () => {
        it('handles empty string values', () => {
            const client = createTestClient();

            client.set.stringValue('');
            assert.strictEquals(client.get.stringValue(), '');
        });

        it('handles zero number values', () => {
            const client = createTestClient();

            client.set.numberValue(0);
            assert.strictEquals(client.get.numberValue(), 0);
        });

        it('handles empty array values', () => {
            const client = createTestClient();

            client.set.arrayValue([]);
            assert.deepEquals(client.get.arrayValue(), []);
        });

        it('handles empty object with required shape properties', () => {
            const client = createTestClient();

            const value = {
                name: '',
                age: 0,
            };
            client.set.objectValue(value);
            assert.deepEquals(client.get.objectValue(), value);
        });

        it('handles negative numbers', () => {
            const client = createTestClient();

            client.set.numberValue(-42);
            assert.strictEquals(client.get.numberValue(), -42);
        });

        it('handles floating point numbers', () => {
            const client = createTestClient();

            client.set.numberValue(3.14);
            assert.strictEquals(client.get.numberValue(), 3.14);
        });

        it('handles special string characters', () => {
            const client = createTestClient();

            const specialString = 'Hello\nWorld\t"quotes" & <tags> 🎉';
            client.set.stringValue(specialString);
            assert.strictEquals(client.get.stringValue(), specialString);
        });

        it('handles unicode strings', () => {
            const client = createTestClient();

            /* cspell:disable-next-line */
            const unicodeString = '日本語 中文 한국어 العربية';
            client.set.stringValue(unicodeString);
            assert.strictEquals(client.get.stringValue(), unicodeString);
        });
    });
});
