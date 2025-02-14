from django.shortcuts import render
from django.shortcuts import redirect
from catalog.models import IphoneCase
from orders.cart import Cart
from orders.forms import CartAddIphoneCaseForm, OrderCreateForm
from django.contrib.auth.decorators import login_required
from orders.models import Order, OrderItem
from django.core.mail import send_mail
from django.conf import settings
from django.views.generic.base import RedirectView, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import uuid
from django.urls import reverse
from orders.customButton import CustomPayPalPaymentsForm
from paypal.standard.forms import PayPalPaymentsForm
import stripe
from django.http import JsonResponse
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
from email.message import EmailMessage
import ssl
import smtplib

@login_required
def cart_add(request, slug):
    """Add case to cart or update de quantity of the case in the cart

        Args:
            slug : slug of the case

        Author : Adrian Crespo Musheghyan
    """
    cart = Cart(request)


    if request.method == 'POST':
        form = CartAddIphoneCaseForm(request.POST)

        if form.is_valid():
            case = IphoneCase.objects.filter(slug=slug).first()

            quantity = form.cleaned_data['quantity']
            cart.add(case, quantity, (str(case.id) in cart.cart))

    return redirect('home')


@login_required
def cart_remove(request, slug):
    """Remove case from the cart

        Args:
            slug : slug of the case

        Author : Adrian Crespo Musheghyan
    """
    cart = Cart(request)

    case = IphoneCase.objects.filter(slug=slug).first()
    cart.remove(case)

    return redirect('cart_list')




def about(request):

    return render(request, 'about.html', None)


@login_required
def get_cart(request):
    """Returns the cases in the cart

        Author : Adrian Crespo Musheghyan
    """
    cart = Cart(request)
    cart_items = []

    for item in cart.__iter__():
        cart_items.append(item)
        

    today = datetime.now()
    estimated_delivery = today + timedelta(days=3)
    estimated_delivery_end = today + timedelta(days=5)
    total_cart = cart.get_total_price()
    template_name = 'cart.html'
    context = {'cart_items': cart_items, 'total_cart': total_cart,
               'estimated_delivery_init': estimated_delivery.strftime('%d/%m/%Y'),
               'estimated_delivery_end': estimated_delivery_end.strftime('%d/%m/%Y') }

    return render(request, template_name, context)



def send_order_confirmation_email(email_reciever, order_id):
    load_dotenv()
    password = os.getenv('EMAIL_PASSWORD')
    password = "uiqr mnnz ebep polu"
    email_sender = "iphonecasemarketorders@gmail.com"

    em = EmailMessage()
    em.set_content('Order number: ' + str(order_id) + ' has been created')
    em['Subject'] = 'Order confirmation'
    em['From'] = email_sender
    em['To'] = email_reciever
    
    context = ssl.create_default_context()

    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
        server.login(email_sender, password)
        server.sendmail(email_sender, email_reciever, em.as_string())


@login_required
def order_form(request):
    """Order create form

        Return: Form to create the order

        Author : Adrian Crespo Musheghyan
    """
    if request.method == 'POST':
        form = OrderCreateForm(request.POST)
        if form.is_valid():
            cart = Cart(request)
            cartItems = cart.cart

            order = Order(first_name=form.cleaned_data['first_name'], last_name=form.cleaned_data['last_name'], email=form.cleaned_data['email'],
                          address=form.cleaned_data['address'], postal_code=form.cleaned_data['postal_code'], city=form.cleaned_data['city'])

            order.save()

            for key, value in cartItems.items():
                newItem = OrderItem(order=order, case=IphoneCase.objects.filter(
                    id=key).first(), price=value['price'], quantity=value['quantity'])
                newItem.save()


            template_name = 'created.html'
            context = {'orderid': order.id, }
            return redirect('https://www.paypal.com/cgi-bin/webscr')
    else:
        form = OrderCreateForm()

    template_name = 'create.html'
    cart = Cart(request)

    host = request.get_host()
    total_cart = cart.get_total_price()


    paypal_checkout = {
        'business': settings.PAYPAL_RECEIVER_EMAIL,
        'amount': float(cart.get_total_price()),
        'item_name': "iphoneCase",
        'invoice': uuid.uuid4(),
        'currency_code': 'EUR',
        'notify_url': f'https://{host}{reverse("paypal-ipn")}',
        'return_url': f'http://{host}{reverse("payment-success")}',
        'cancel_url': f'http://{host}{reverse("payment-failed")}',
        'custom': "iphoneCase",
    }

    paypal_payment = CustomPayPalPaymentsForm(initial=paypal_checkout)
    context = {
        'paypal': paypal_payment,
        'form': form,
        'cart' : cart,
        'total_cart' : cart.get_total_price()
    }

    if cart.cart.__len__() == 0:
        context['badRequest'] = True

    

    return render(request, template_name, context)

def PaymentSuccessful(request):

    cart = Cart(request)

    if not cart.cart:
        return redirect('cart_list')  # Redirigir si el carrito está vacío
    
    cartItems = cart.cart

    order = Order.objects.create(
        first_name=request.user.first_name,
        last_name=request.user.last_name,
        email=request.user.email,
        address="Dirección de prueba",  # Deberías recuperar esto de la sesión o la base de datos
        postal_code="00000",
        city="Ciudad de prueba"
    )

    for key, value in cartItems.items():
        case = IphoneCase.objects.filter(id=key).first()
        if case:
            OrderItem.objects.create(order=order, case=case, price=value['price'], quantity=value['quantity'])

    cart.clear()
    send_order_confirmation_email(request.user.email, order.id)

    return render(request, 'created.html', {'orderid': order.id})

def PaymentFailed(request):
    return render(request, 'created.html')




@login_required
@csrf_exempt
def handle_paypal_ipn(request):
    '''
    PayPal enviará la notificación aquí
    '''
    # print("func handle: ", request.POST)
    if request.POST != {}:
        transaccion = TransaccionPaypal(
            payer_id=request.POST['payer_id'],
            payment_date=strfotime(request.POST['payment_date']),
            payment_status=request.POST['payment_status'],
            quantity=request.POST['quantity'],
            invoice=request.POST['invoice'],
            first_name=request.POST['first_name'],
            payer_status=request.POST['payer_status'],
            payer_email=request.POST['payer_email'],
            txn_id=request.POST['txn_id'],
            reciver_id=request.POST['receiver_id'],
            residence_country=request.POST['residence_country'],
            payment_gross=request.POST['payment_gross'],
            custom=request.POST['custom'],
        )
        transaccion.save()
    return HttpResponse(status=200)

def strfotime(i_time: str):
    meses = {name: index for index, name in enumerate(
        "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), 1)}
    i_time_space = i_time.split(" ")
    year = int(i_time_space[3])
    month = meses[i_time_space[1]]
    day = int(i_time_space[2].replace(',', ''))
    hora, min, seg = map(int, i_time_space[0].split(":"))
    
    return datetime(year, month, day, hora, min, seg)



@login_required
def order_created(request):
    """Order cretated

        Return: Order created template

        Author : Adrian Crespo Musheghyan
    """
    template_name = 'created.html'
    context = {}

    return render(request, template_name, context)


@login_required
@csrf_exempt
def create_payment_intent(request):
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        # Define el monto y la moneda
        intent = stripe.PaymentIntent.create(
            amount=5000,  # En centavos: $50.00
            currency='usd',
            payment_method_types=['card'],
        )
        return JsonResponse({
            'clientSecret': intent['client_secret']
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)











