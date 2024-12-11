from decimal import Decimal
from django.conf import settings
from catalog.models import IphoneCase


class Cart (object):
    def __init__(self, request):

        # request session is the only variable
        # that persists between two http accesses
        # from the same client
        self.session = request.session
        cart = self.session.get(settings.CART_SESSION_ID)
        if not cart:
            # If there is no cart create an empty one
            # and save it in the session
            cart = self.session[settings.CART_SESSION_ID] = {}
        self.cart = cart

    def add(self, case, quantity=1, update_quantity=False):
        """Add item to cart

            Params:
                case: case to add
                quantity: units of the case to add
                update_quantity: if the case is in cart add more units,
                otherwise add new key to cart

                Author : Adrian Crespo Musheghyan
        """
        if (str(case.id) in self.cart):
            self.cart[str(case.id)]['quantity'] += int(quantity)
        else:
            self.cart[str(case.id)] = {'quantity': int(
                quantity), 'price': round(float(case.price), 2)}

        # end of your code goes here
        self.save()

    def save(self):
        # update the session cart
        self.session[settings.CART_SESSION_ID] = self.cart
        # mark the session as " modified "
        # to make sure it is saved
        # django saves the session if
        # new pairs key : value are
        # added or deleted but what is
        # modified is inside self . cart
        # and django does not realize
        # that it has been modified .
        self.session.modified = True

    def remove(self, case):

        del self.cart[str(case.id)]
        self.save()

    def __iter__(self):

        case_ids = self.cart.keys()
        # get the case objects and add them to the cart
        cases = IphoneCase.objects.filter(id__in=case_ids)
        for case in cases:
            self.cart[str(case.id)]['case'] = case
        for item in self.cart.values():

            item['price'] = round(Decimal(item['price']),2)
            item['total_price'] = round(item['price'] * item['quantity'],2)
            yield item

    def __len__(self):
        # Number of total items on cart
        numItems = 0
        for item in self.cart.values():
            numItems += int(item['quantity'])

        return numItems

    def get_total_price(self):
        # Total price cart
        totalAmount = 0

        for item in self.cart.values():
            totalAmount += item['quantity'] * Decimal(item['price'])

        return round(totalAmount,2)

    def clear(self):
        # remove cart from session
        del self.session[settings.CART_SESSION_ID]
        self.session.modified = True
