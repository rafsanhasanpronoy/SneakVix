from rest_framework.views import exception_handler


UNAUTHORIZED_MESSAGE = "Please sign in to continue."
FORBIDDEN_MESSAGE = "You do not have permission to perform this action."
ORDER_NOT_FOUND_MESSAGE = "Order not found."


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    request = context.get("request")
    view = context.get("view")

    if response.status_code == 401:
        response.data = {"error": UNAUTHORIZED_MESSAGE}
    elif response.status_code == 403:
        response.data = {"error": FORBIDDEN_MESSAGE}
    elif response.status_code == 404:
        path = getattr(request, "path", "") if request else ""
        view_name = view.__class__.__name__ if view else ""
        if "order" in path.lower() or "OrderViewSet" in view_name:
            response.data = {"error": ORDER_NOT_FOUND_MESSAGE}

    return response
