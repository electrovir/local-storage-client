# @electrovir/local-storage-client

An interface for storing values into the LocalStorage API with type safety. Note that only JSON compatible data can be stored.

Note that some browsers aggressively clear LocalStorage so this should only be used for ephemeral data storage.

Reference docs: http://electrovir.github.io/local-storage-client

## Instal

```sh
npm i @electrovir/local-storage-client
```

## Usage

<!-- example-link: src/local-storage.client.example.ts -->

```TypeScript
import {defineShape} from 'object-shape-tester';
import {LocalStorageClient} from '@electrovir/local-storage-client';

const myClient = new LocalStorageClient({
    stringValue: defineShape(''),
    numberValue: defineShape(-1),
    booleanValue: defineShape(false),
    objectValue: defineShape({
        name: '',
        age: 0,
        location: '',
    }),
});

/** Set values with type safety. */
myClient.set.objectValue({
    age: 10,
    location: 'Earth',
    name: 'Example User',
});
myClient.set.booleanValue(true);

/** Delete a stored value. */
myClient.delete.booleanValue();

/** Get a stored value. If the stored value is not valid, `undefined` is returned. */
myClient.get.objectValue();
```
