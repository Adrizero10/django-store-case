from django.core.exceptions import ValidationError
from django.core.validators import MaxLengthValidator, MinLengthValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _
from catalog.models import IphoneCase


def validate_digit(value):
    """Check that all characters in a string are numbers

        Author : Adrian Crespo Musheghyan
    """
    if not value.isdigit():
        raise ValidationError(
            _('Postal code must be digits')
        )


class Order(models.Model):
    """Order model, customers can make orders

        Author : Adrian Crespo Musheghyan
    """
    first_name = models.CharField(
        max_length=64, verbose_name="First Name", help_text="Required",)
    last_name = models.CharField(
        max_length=64, verbose_name="Last Name", help_text="Required")
    email = models.EmailField(max_length=64, help_text="Required")
    address = models.CharField(
        max_length=128, verbose_name="Address", help_text="Required")
    postal_code = models.CharField(verbose_name="Postal Code", validators=[MinLengthValidator(
        5), MaxLengthValidator(5), validate_digit], help_text="Required. We only ship to Spain so... the postal code must be 5 digits", max_length=5)
    city = models.CharField(
        max_length=256, verbose_name="City", help_text="Required")
    created = models.DateTimeField(
        verbose_name="Order created", auto_now_add=True)
    updated = models.DateTimeField(verbose_name="Order updated", auto_now=True)
    paid = models.BooleanField(verbose_name="Status paid order", default=False)

    def get_total_cost(self):
        """Returns total cost orders items

            Author : Adrian Crespo Musheghyan
        """
        items_orders = OrderItem.objects.filter(order=self.id)
        total = 0

        for item in items_orders:
            total += item.price * item.quantity

        return total

    # Metadata
    class Meta:
        ordering = ["first_name", "last_name", "email", "updated", "paid"]
        verbose_name = "Order"
        verbose_name_plural = "Orders"

    def __str__(self):

        return 'Address %s, Postal_code %s, City %s, Created %s' % (str(self.address), str(self.postal_code), str(self.city), str(self.created))


class OrderItem(models.Model):
    """OrderItem items in orders

        Args:
            order: order of the item
            case: case item in order
            price: price of the case at the time it was purchased
            quantity: units of the case

        Author : Adrian Crespo Musheghyan
    """
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, verbose_name="Order id", related_name='items')
    case = models.ForeignKey(
        IphoneCase, on_delete=models.CASCADE, verbose_name="IphoneCase")
    price = models.DecimalField(max_digits=7, decimal_places=2, verbose_name='Price',
                                validators=[MinValueValidator(0)], help_text='Price cant be negative')
    quantity = models.PositiveSmallIntegerField(
        default=0, verbose_name='Quantity', help_text='Number items')

    class Meta:
        ordering = ["order", "case", "price", "quantity"]
        verbose_name = "OrderItem"
        verbose_name_plural = "OrderItems"

    def __str__(self):

        return 'Order %s, IphoneCase %s, Price %s, Quantity %s ' % (str(self.order), str(self.case.name), str(self.price), str(self.quantity))



class TransaccionPaypal(models.Model):
    payer_id = models.CharField(max_length= 256)
    payment_date = models.DateTimeField()
    payment_status = models.CharField(max_length= 256)
    quantity = models.IntegerField()
    invoce = models.CharField(max_length= 256)
    first_name= models.CharField(max_length= 256)
    payer_status = models.CharField(max_length= 256)
    payer_email = models.CharField(max_length= 256)
    txn_id = models.CharField(max_length= 256)
    receiver_id = models.CharField(max_length= 256)
    payment_gross = models.FloatField()
    custom = models.CharField(max_length= 256)

    def __str__(self):
        return self.custom




class Payment(models.Model):
    stripe_payment_intent_id = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10)
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
