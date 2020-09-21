import sendRequestAndGetResponse from './sendRequestAndGetResponse';

const BASE_PATH = '/api/v1/team-member';

export const getSignedRequestForUploadApiMethod = ({ fileName, fileType, prefix, bucket }) =>
  sendRequestAndGetResponse(`${BASE_PATH}/aws/get-signed-request-for-upload-to-s3`, {
    body: JSON.stringify({ fileName, fileType, prefix, bucket }),
  });

export const uploadFileUsingSignedPutRequestApiMethod = (file, signedRequest, headers = {}) =>
  sendRequestAndGetResponse(signedRequest, {
    externalServer: true,
    method: 'PUT',
    body: file,
    headers,
  });

export const updateProfileApiMethod = (data) =>
sendRequestAndGetResponse(`${BASE_PATH}/user/update-profile`, {
  body: JSON.stringify(data),
});

export const toggleThemeApiMethod = (data) =>
  sendRequestAndGetResponse(`${BASE_PATH}/user/toggle-theme`, {
    body: JSON.stringify(data),
  });

  export const fetchCheckoutSessionApiMethod = ({ mode, uid }: { mode: string; uid: string }) =>
  sendRequestAndGetResponse(`${BASE_PATH}/stripe/fetch-checkout-session`, {
    body: JSON.stringify({ mode, uid }),
  });

export const cancelSubscriptionApiMethod = ({ uid }: { uid: string }) =>
  sendRequestAndGetResponse(`${BASE_PATH}/cancel-subscription`, {
    body: JSON.stringify({ uid }),
  });

export const getListOfInvoicesApiMethod = () =>
  sendRequestAndGetResponse(`${BASE_PATH}/get-list-of-invoices-for-customer`, {
    method: 'GET',
  });