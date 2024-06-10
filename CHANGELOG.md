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