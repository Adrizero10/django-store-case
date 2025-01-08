from paypal.standard.forms import PayPalPaymentsForm
from django.utils.html import format_html

class CustomPayPalPaymentsForm(PayPalPaymentsForm):

    def get_html_submit_element(self):
        return format_html(
            """<button type="submit" name="submit" alt="Continúa con el pago" class="btn btn-outline-primary btn-lg btn-block">
                <span>Continúa con el pago</span>
                <img src="/static/img/paypal.png" alt="PayPal Logo" style="width: 6rem; height: auto; margin-left: 0.5rem;"/>
            </button>
            <p class= "mt-2 ml-2">Puede pagar con tarjeta de crédito o débido a través de PayPal</p>
            <p class= "mt-2 ml-2">Seleccione la opción <strong>Pagar con tarjeta de crédito o débito</strong></p>

"""
                    )