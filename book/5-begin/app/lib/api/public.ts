import sendRequestAndGetResponse from './sendRequestAndGetResponse';

const BASE_PATH = '/api/v1/public';

// export const getUser = (request) =>
//   sendRequestAndGetResponse(`${BASE_PATH}/get-user`, {
//     request,
//     method: 'GET',
//   });

export const getUserBySlugApiMethod = (slug) =>
  sendRequestAndGetResponse(`${BASE_PATH}/get-user-by-slug`, {
    body: JSON.stringify({ slug }),
  });

export const updateProfileApiMethod = (data) =>
  sendRequestAndGetResponse(`${BASE_PATH}/user/update-profile`, {
    body: JSON.stringify(data),
  });

export const getUserApiMethod = (opts = {}) =>
  sendRequestAndGetResponse(
    `${BASE_PATH}/get-user`,
    Object.assign(
      {
        method: 'GET',
      },
      opts,
    ),
  );
