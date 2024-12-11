from django import forms
from django.utils.translation import gettext_lazy as _
from orders.models import Order


class CartAddIphoneCaseForm (forms.Form):
    """Form to choose num_units of the case to buy

        quantity : Dropdown select integer 1 - 20

            Author : Adrian Crespo Musheghyan
    """
    quantity = forms.TypedChoiceField(
        choices=[(x, x) for x in range(1, 21)], label="Quantity", coerce=int)


class OrderCreateForm(forms.ModelForm):
    """Model form, this form cretes a new order with the items in cart session

            Author : Adrian Crespo Musheghyan
    """
    class Meta:
        model = Order
        exclude = ['created', 'updated', 'paid']
        labels = {'first_name': 'First Name', 'last_name': 'Last Name', 'email': 'Email',
                  'address': 'Address', 'postal_code': 'Postal Code', 'city': 'City'}
        help_texts = {
            'postal_code': "Required. We only ship to Spain so... the postal code must be 5 digits"}
        error_messages = {
            'first_name': {
                'max_length': _("First Name is limited to 64 characters."),
            },
            'last_name': {
                'max_length': _("Last Name is limited to 64 characters."),
            },
            'postal_code': {
                'max_length': _("Postal code must be 5 characters."),
                'min_length': _("Postal code must be 5 characters."),
            },
            'email': {
                'invalid': _("Email format is not correct"),
            },
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields:
            self.fields[field].widget.attrs.update(
                {'class': 'formInput-style'})
