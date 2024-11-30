## 3.3.2 (2024-11-30)

### 🩹 Fixes

- **core:** Fixing the class parameter in event store to allow private and protected constructors. ([f157b38](https://github.com/NickTsitlakidis/event-nest/commit/f157b38))

### ❤️ Thank You

- Nick Tsitlakidis

## 3.3.1 (2024-11-30)

### 🩹 Fixes

- Setting correct min node version in library package files ([726cef6](https://github.com/NickTsitlakidis/event-nest/commit/726cef6))
- **postgresql:** Table initialization is now aware of schema name ([a6da091](https://github.com/NickTsitlakidis/event-nest/commit/a6da091))

### ❤️ Thank You

- Nick Tsitlakidis

## 3.3.0 (2024-11-24)


### 🚀 Features

- New configuration flag to initialize Postgresql tables on application bootstrap. ([#38](https://github.com/NickTsitlakidis/event-nest/pull/38))

### ❤️  Thank You

- Nick Tsitlakidis

## 3.2.1 (2024-09-04)


### 🩹 Fixes

- Event store implementations are exported properly from their modules ([c1fe9ba](https://github.com/NickTsitlakidis/event-nest/commit/c1fe9ba))

### ❤️  Thank You

- Nick Tsitlakidis

## 3.2.0 (2024-08-05)


### 🚀 Features

- Adding support for scoped module registration in Postgres library ([c19a72c](https://github.com/NickTsitlakidis/event-nest/commit/c19a72c))
- Adding support for scoped module registration in MongoDB library ([96f800c](https://github.com/NickTsitlakidis/event-nest/commit/96f800c))

### ❤️  Thank You

- Nick Tsitlakidis

## 3.1.0 (2024-07-03)


### 🚀 Features

- Addition of event store method to retrieve events of a specific aggregate root class based on multiple entity ids. ([ead4e8f](https://github.com/NickTsitlakidis/event-nest/commit/ead4e8f))

### 🩹 Fixes

- Upgrading mongo,nest and reflect-metadata dependencies to resolve security issues. ([617d475](https://github.com/NickTsitlakidis/event-nest/commit/617d475))

### ❤️  Thank You

- Nick Tsitlakidis

## 3.0.1 (2024-06-10)


### 🩹 Fixes

- **core:** Fixing parameter type of domain event subscription to accept only rest parameters ([edab002](https://github.com/NickTsitlakidis/event-nest/commit/edab002))
- **postgresql:** Database connection is now using default ssl options if an options parameter is not given. ([fe5c5fa](https://github.com/NickTsitlakidis/event-nest/commit/fe5c5fa))

### ❤️  Thank You

- Nick Tsitlakidis

# 3.0.0 (2024-06-04)


### 🚀 Features

- ⚠️  Renaming EventProcessor decorator to ApplyEvent. ([22f4f71](https://github.com/NickTsitlakidis/event-nest/commit/22f4f71))
- Removing uuid library dependency and using native crypto random uuid function. ([01e2860](https://github.com/NickTsitlakidis/event-nest/commit/01e2860))
- ⚠️  Setting minimum node version to 18.x ([be5b68c](https://github.com/NickTsitlakidis/event-nest/commit/be5b68c))

### 🩹 Fixes

- Appended events are not cleared if the commit operation fails ([13234f4](https://github.com/NickTsitlakidis/event-nest/commit/13234f4))

#### ⚠️  Breaking Changes

- ⚠️  Renaming EventProcessor decorator to ApplyEvent. ([22f4f71](https://github.com/NickTsitlakidis/event-nest/commit/22f4f71))
- ⚠️  Setting minimum node version to 18.x ([be5b68c](https://github.com/NickTsitlakidis/event-nest/commit/be5b68c))

### ❤️  Thank You

- Nick Tsitlakidis
